from flask_cors import CORS
from flask import Flask, request, send_file, jsonify
import os
from docx2pdf import convert
from PyPDF2 import PdfMerger
import uuid
import shutil
import logging
import win32com.client
import pythoncom
import zipfile
import re
import threading
from pathlib import PurePosixPath

app = Flask(__name__)
CORS(app)  # 允许所有跨域请求，生产环境可指定 origins

UPLOAD_FOLDER = 'uploads'
PDF_FOLDER = 'pdfs'
MERGED_FOLDER = 'merged'
COMPLETE_FOLDER = 'complete'  # 新增：完整压缩包文件夹
PRINT_CERTIFICATE_FOLDER_NAME = '打印版证书'
PRINT_CERTIFICATE_MARKER = '打印版'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PDF_FOLDER, exist_ok=True)
os.makedirs(MERGED_FOLDER, exist_ok=True)
os.makedirs(COMPLETE_FOLDER, exist_ok=True)

def normalize_zip_filename(filename, default_filename):
    safe_filename = filename or default_filename
    safe_filename = safe_filename.replace('\\', '/').split('/')[-1]
    if not safe_filename.lower().endswith('.zip'):
        safe_filename = f'{safe_filename}.zip'
    return safe_filename

def add_docx_files_to_zip(zipf, docx_folder):
    file_count = 0
    if not os.path.exists(docx_folder):
        return file_count

    for file in sorted(os.listdir(docx_folder)):
        if file.endswith('.docx') and not file.startswith('~$'):
            file_path = os.path.join(docx_folder, file)
            if PRINT_CERTIFICATE_MARKER in file:
                archive_path = f"{PRINT_CERTIFICATE_FOLDER_NAME}/{file}"
            elif '原始记录' in file:
                archive_path = f"原始记录/{file}"
            else:
                archive_path = file
            zipf.write(file_path, archive_path)
            file_count += 1

    return file_count

# 全局任务进度字典
task_status = {}
folder_conversion_lock = threading.Lock()

WINDOWS_INVALID_FILENAME_CHARS = '<>:"|?*'
WINDOWS_RESERVED_NAMES = {
    'CON', 'PRN', 'AUX', 'NUL',
    *(f'COM{i}' for i in range(1, 10)),
    *(f'LPT{i}' for i in range(1, 10)),
}


def is_valid_task_id(task_id):
    try:
        return str(uuid.UUID(task_id)) == task_id.lower()
    except (ValueError, AttributeError):
        return False


def normalize_upload_relative_path(relative_path, fallback_filename):
    raw_path = (relative_path or fallback_filename or '').replace('\\', '/')
    if not raw_path or '\x00' in raw_path:
        raise ValueError('文件路径为空或无效')
    if raw_path.startswith('/') or re.match(r'^[A-Za-z]:/', raw_path):
        raise ValueError('不允许使用绝对路径')

    path = PurePosixPath(raw_path)
    safe_parts = []
    for part in path.parts:
        if part in ('', '.', '..'):
            raise ValueError('文件路径包含非法目录')
        safe_part = ''.join(
            '_' if char in WINDOWS_INVALID_FILENAME_CHARS or ord(char) < 32 else char
            for char in part
        ).rstrip(' .')
        if not safe_part:
            raise ValueError('文件名无效')
        if safe_part.split('.')[0].upper() in WINDOWS_RESERVED_NAMES:
            safe_part = f'_{safe_part}'
        safe_parts.append(safe_part)

    return os.path.join(*safe_parts)


def list_convertible_docx_files(folder):
    files = []
    for current_root, _, filenames in os.walk(folder):
        for filename in filenames:
            if filename.lower().endswith('.docx') and not filename.startswith('~$'):
                full_path = os.path.join(current_root, filename)
                files.append(os.path.relpath(full_path, folder))
    return sorted(files, key=lambda value: value.casefold())

# 新增：根路径路由，避免404错误
@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'status': 'running',
        'message': '证书生成服务正在运行',
        'version': '2.0',
        'endpoints': [
            'POST /upload - 上传文件',
            'POST /convert/<task_id> - 转换PDF',
            'POST /merge/<task_id> - 合并PDF',
            'POST /package/<task_id> - 生成完整压缩包',
            'GET /progress/<task_id> - 查询进度',
            'GET /download/<task_id>/<filetype> - 下载文件'
        ]
    })

# 新增：健康检查接口
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': str(uuid.uuid4()),
        'active_tasks': len(task_status)
    })

@app.route('/upload', methods=['POST'])
def upload_files():
    task_folder = None
    try:
        files = request.files.getlist('files')
        if not files:
            return jsonify({'error': '没有上传文件'}), 400

        relative_paths = request.form.getlist('relative_paths')
        if relative_paths and len(relative_paths) != len(files):
            return jsonify({'error': '文件数量与相对路径数量不一致'}), 400
        
        task_id = str(uuid.uuid4())
        task_folder = os.path.join(UPLOAD_FOLDER, task_id)
        os.makedirs(task_folder, exist_ok=True)
        
        uploaded_count = 0
        saved_paths = set()
        for index, file in enumerate(files):
            if file.filename:
                requested_path = relative_paths[index] if relative_paths else file.filename
                safe_relative_path = normalize_upload_relative_path(requested_path, file.filename)
                normalized_key = safe_relative_path.casefold()
                if normalized_key in saved_paths:
                    raise ValueError(f'存在重复文件路径: {requested_path}')
                saved_paths.add(normalized_key)

                destination = os.path.abspath(os.path.join(task_folder, safe_relative_path))
                task_root = os.path.abspath(task_folder)
                if os.path.commonpath([task_root, destination]) != task_root:
                    raise ValueError('文件路径超出任务目录')
                os.makedirs(os.path.dirname(destination), exist_ok=True)
                file.save(destination)
                uploaded_count += 1

        if uploaded_count == 0:
            raise ValueError('没有可保存的文件')
        
        print(f"上传成功，任务ID: {task_id}，文件数量: {uploaded_count}")
        return jsonify({
            'task_id': task_id, 
            'msg': '上传成功',
            'file_count': uploaded_count
        })
    except ValueError as e:
        if task_folder and os.path.exists(task_folder):
            shutil.rmtree(task_folder, ignore_errors=True)
        print(f"上传文件失败: {str(e)}")
        return jsonify({'error': f'上传失败: {str(e)}'}), 400
    except Exception as e:
        if task_folder and os.path.exists(task_folder):
            shutil.rmtree(task_folder, ignore_errors=True)
        print(f"上传文件失败: {str(e)}")
        return jsonify({'error': f'上传失败: {str(e)}'}), 500

@app.route('/convert/<task_id>', methods=['POST'])
def convert_to_pdf(task_id):
    try:
        task_folder = os.path.join(UPLOAD_FOLDER, task_id)
        if not os.path.exists(task_folder):
            return jsonify({'error': '任务文件夹不存在'}), 404
            
        pdf_task_folder = os.path.join(PDF_FOLDER, task_id)
        os.makedirs(pdf_task_folder, exist_ok=True)
        files = [
            f for f in os.listdir(task_folder)
            if f.endswith('.docx') and not f.startswith('~$') and PRINT_CERTIFICATE_MARKER not in f
        ]
        total = len(files)
        
        if total == 0:
            return jsonify({'error': '没有找到可转换的docx文件'}), 400
        
        # 初始化进度，新增 logs 字段
        task_status[task_id] = {
            'total': total,
            'current': 0,
            'current_file': '',
            'results': [],
            'done': False,
            'convert_done': False,
            'merge_done': False,
            'package_done': False,
            'logs': []  # 新增
        }
        
        log = f"开始批量转换PDF，任务ID: {task_id}，文件数量: {total}"
        print(log)
        task_status[task_id]['logs'].append(log)
        
        # 调用批量转换函数
        results = batch_convert_docx_to_pdf(task_folder, pdf_task_folder, task_id)
        
        # 标记转换完成
        task_status[task_id]['convert_done'] = True
        task_status[task_id]['done'] = False  # 整体还未完成
        log = f"PDF批量转换完成，任务ID: {task_id}"
        print(log)
        task_status[task_id]['logs'].append(log)
        
        return jsonify({
            'msg': '转换完成', 
            'results': results, 
            'pdf_folder': pdf_task_folder,
            'success_count': len([r for r in results if r['status'] == 'success'])
        })
    except Exception as e:
        print(f"转换PDF失败: {str(e)}")
        if task_id in task_status:
            task_status[task_id]['logs'].append(f"转换PDF失败: {str(e)}")
        return jsonify({'error': f'转换失败: {str(e)}'}), 500

# 新增：批量转换函数，复用 Word 进程
def batch_convert_docx_to_pdf(docx_folder, pdf_folder, task_id=None):
    results = []
    word = None
    pythoncom.CoInitialize()  # 新增：初始化 COM
    try:
        word = win32com.client.Dispatch('Word.Application')
        word.Visible = False
        files = [
            f for f in os.listdir(docx_folder)
            if f.endswith('.docx') and not f.startswith('~$') and PRINT_CERTIFICATE_MARKER not in f
        ]
        total = len(files)
        for idx, filename in enumerate(files):
            src = os.path.abspath(os.path.join(docx_folder, filename))
            dst = os.path.abspath(os.path.join(pdf_folder, filename.replace('.docx', '.pdf')))
            try:
                doc = word.Documents.Open(src)
                doc.SaveAs(dst, FileFormat=17)
                doc.Close()
                result = {'file': filename, 'status': 'success'}
                log = f"转换成功: {filename}"
                print(log)
            except Exception as e:
                result = {'file': filename, 'status': 'fail', 'reason': str(e)}
                log = f"转换失败: {filename} - {str(e)}"
                print(log)
            results.append(result)
            # 实时更新进度和日志
            if task_id and task_id in task_status:
                task_status[task_id]['current'] = idx + 1
                task_status[task_id]['current_file'] = filename
                task_status[task_id]['results'] = results.copy()
                if 'logs' in task_status[task_id]:
                    task_status[task_id]['logs'].append(log)
        return results
    finally:
        if word:
            word.Quit()
        pythoncom.CoUninitialize()  # 新增：释放 COM


def batch_convert_folder_docx_to_pdf(docx_folder, pdf_folder, task_id):
    results = []
    word = None
    pythoncom.CoInitialize()
    try:
        word = win32com.client.DispatchEx('Word.Application')
        word.Visible = False
        word.DisplayAlerts = 0
        files = list_convertible_docx_files(docx_folder)

        for index, relative_path in enumerate(files):
            source_path = os.path.abspath(os.path.join(docx_folder, relative_path))
            pdf_relative_path = os.path.splitext(relative_path)[0] + '.pdf'
            destination_path = os.path.abspath(os.path.join(pdf_folder, pdf_relative_path))
            os.makedirs(os.path.dirname(destination_path), exist_ok=True)
            document = None
            try:
                document = word.Documents.Open(
                    source_path,
                    ReadOnly=True,
                    AddToRecentFiles=False,
                )
                document.SaveAs(destination_path, FileFormat=17)
                document.Close(False)
                document = None
                if not os.path.exists(destination_path) or os.path.getsize(destination_path) == 0:
                    raise RuntimeError('Word 未生成有效的 PDF 文件')
                result = {
                    'file': relative_path.replace(os.sep, '/'),
                    'pdf': pdf_relative_path.replace(os.sep, '/'),
                    'status': 'success',
                }
                log = f"转换成功: {relative_path}"
            except Exception as error:
                if document is not None:
                    try:
                        document.Close(False)
                    except Exception:
                        pass
                result = {
                    'file': relative_path.replace(os.sep, '/'),
                    'status': 'fail',
                    'reason': str(error),
                }
                log = f"转换失败: {relative_path} - {str(error)}"

            print(log)
            results.append(result)
            status = task_status.get(task_id)
            if status is not None:
                status['current'] = index + 1
                status['current_file'] = relative_path.replace(os.sep, '/')
                status['results'] = results.copy()
                status['logs'].append(log)

        return results
    finally:
        if word:
            word.Quit()
        pythoncom.CoUninitialize()


def create_pdf_only_zip(pdf_folder, zip_path):
    temporary_zip_path = f'{zip_path}.tmp'
    if os.path.exists(temporary_zip_path):
        os.remove(temporary_zip_path)

    file_count = 0
    try:
        with zipfile.ZipFile(temporary_zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for current_root, _, filenames in os.walk(pdf_folder):
                for filename in sorted(filenames, key=str.casefold):
                    if not filename.lower().endswith('.pdf'):
                        continue
                    file_path = os.path.join(current_root, filename)
                    archive_path = os.path.relpath(file_path, pdf_folder).replace(os.sep, '/')
                    zip_file.write(file_path, archive_path)
                    file_count += 1

        if file_count == 0:
            raise RuntimeError('没有可打包的 PDF 文件')
        os.replace(temporary_zip_path, zip_path)
        return file_count
    except Exception:
        if os.path.exists(temporary_zip_path):
            os.remove(temporary_zip_path)
        raise


def process_folder_conversion(task_id):
    task_folder = os.path.join(UPLOAD_FOLDER, task_id)
    pdf_task_folder = os.path.join(PDF_FOLDER, task_id)
    zip_path = os.path.join(COMPLETE_FOLDER, f'{task_id}_converted-pdfs.zip')
    status = task_status[task_id]

    with folder_conversion_lock:
        status['queued'] = False
        status['processing'] = True
        try:
            os.makedirs(pdf_task_folder, exist_ok=True)
            results = batch_convert_folder_docx_to_pdf(
                task_folder,
                pdf_task_folder,
                task_id,
            )
            success_count = sum(result['status'] == 'success' for result in results)
            failure_count = len(results) - success_count
            status['convert_done'] = True
            status['success_count'] = success_count
            status['failure_count'] = failure_count

            if success_count == 0:
                raise RuntimeError('所有 Word 文件均转换失败，未生成 ZIP')

            status['logs'].append('正在打包 PDF 文件')
            archived_count = create_pdf_only_zip(pdf_task_folder, zip_path)
            status['archive_done'] = True
            status['archived_count'] = archived_count
            status['zip_path'] = zip_path
            status['logs'].append(f'PDF ZIP 已生成，共 {archived_count} 个文件')

            # ZIP 完整生成后，删除服务器上的上传副本和中间 PDF；不会影响用户电脑原文件。
            try:
                if os.path.exists(task_folder):
                    shutil.rmtree(task_folder)
                if os.path.exists(pdf_task_folder):
                    shutil.rmtree(pdf_task_folder)
                status['source_cleanup_done'] = not os.path.exists(task_folder)
                status['pdf_cleanup_done'] = not os.path.exists(pdf_task_folder)
            except Exception as cleanup_error:
                status['source_cleanup_done'] = not os.path.exists(task_folder)
                status['pdf_cleanup_done'] = not os.path.exists(pdf_task_folder)
                status['cleanup_error'] = str(cleanup_error)
                status['logs'].append(f'服务器临时文件清理失败: {str(cleanup_error)}')
        except Exception as error:
            status['error'] = str(error)
            status['logs'].append(f'文件夹转换失败: {str(error)}')
            print(f"文件夹转换失败，任务ID: {task_id} - {str(error)}")
        finally:
            status['processing'] = False
            status['done'] = True


@app.route('/convert-folders/<task_id>', methods=['POST'])
def start_folder_conversion(task_id):
    if not is_valid_task_id(task_id):
        return jsonify({'error': '任务ID无效'}), 400

    task_folder = os.path.join(UPLOAD_FOLDER, task_id)
    if not os.path.exists(task_folder):
        return jsonify({'error': '任务文件夹不存在'}), 404

    existing_status = task_status.get(task_id)
    if existing_status and not existing_status.get('done', False):
        return jsonify({'error': '任务正在处理中'}), 409

    files = list_convertible_docx_files(task_folder)
    if not files:
        return jsonify({'error': '没有找到可转换的 DOCX 文件'}), 400

    task_status[task_id] = {
        'mode': 'folder_conversion',
        'total': len(files),
        'current': 0,
        'current_file': '',
        'results': [],
        'done': False,
        'queued': True,
        'processing': False,
        'convert_done': False,
        'archive_done': False,
        'success_count': 0,
        'failure_count': 0,
        'logs': [f'开始转换文件夹，共 {len(files)} 个 DOCX 文件'],
    }

    worker = threading.Thread(
        target=process_folder_conversion,
        args=(task_id,),
        daemon=True,
        name=f'word-to-pdf-{task_id[:8]}',
    )
    worker.start()

    return jsonify({
        'status': 'accepted',
        'task_id': task_id,
        'file_count': len(files),
    }), 202

@app.route('/progress/<task_id>', methods=['GET'])
def get_progress(task_id):
    status = task_status.get(task_id)
    if not status:
        return jsonify({'error': '任务不存在'}), 404
    
    # 证书任务需要转换、合并和打包全部完成；通用文件夹转换自行维护完成状态。
    if status.get('mode') != 'folder_conversion':
        all_done = status.get('convert_done', False) and status.get('merge_done', False) and status.get('package_done', False)
        status['done'] = all_done
    
    # 确保返回 logs 字段
    if 'logs' not in status:
        status['logs'] = []
    return jsonify(status)

@app.route('/merge/<task_id>', methods=['POST'])
def merge_pdfs(task_id):
    try:
        pdf_task_folder = os.path.join(PDF_FOLDER, task_id)
        if not os.path.exists(pdf_task_folder):
            return jsonify({'error': 'PDF文件夹不存在'}), 404
            
        merged_file = os.path.join(MERGED_FOLDER, f'{task_id}_merged.pdf')
        merger = PdfMerger()
        pdfs = [f for f in sorted(os.listdir(pdf_task_folder)) if f.endswith('.pdf')]
        
        log = f"合并PDF，任务ID: {task_id}，PDF数量: {len(pdfs)}"
        print(log)
        if task_id in task_status and 'logs' in task_status[task_id]:
            task_status[task_id]['logs'].append(log)
        
        if not pdfs:
            log = "没有可合并的 PDF 文件"
            print(log)
            if task_id in task_status and 'logs' in task_status[task_id]:
                task_status[task_id]['logs'].append(log)
            return jsonify({'msg': log, 'merged_file': None}), 400
        
        for filename in pdfs:
            pdf_path = os.path.join(pdf_task_folder, filename)
            log = f"合并文件: {filename}"
            print(log)
            if task_id in task_status and 'logs' in task_status[task_id]:
                task_status[task_id]['logs'].append(log)
            try:
                merger.append(pdf_path)
            except Exception as e:
                log = f"合并文件失败 {filename}: {str(e)}"
                print(log)
                if task_id in task_status and 'logs' in task_status[task_id]:
                    task_status[task_id]['logs'].append(log)
                continue
        
        merger.write(merged_file)
        merger.close()
        log = f"合并完成，输出文件: {merged_file}"
        print(log)
        if task_id in task_status and 'logs' in task_status[task_id]:
            task_status[task_id]['logs'].append(log)
        
        # 更新任务状态
        if task_id in task_status:
            task_status[task_id]['merge_done'] = True
        
        return jsonify({
            'msg': '合并完成', 
            'merged_file': merged_file,
            'pdf_count': len(pdfs)
        })
    except Exception as e:
        log = f"合并PDF失败: {str(e)}"
        print(log)
        if task_id in task_status and 'logs' in task_status[task_id]:
            task_status[task_id]['logs'].append(log)
        return jsonify({'error': f'合并失败: {str(e)}'}), 500

# 新增：生成完整压缩包接口
@app.route('/package/<task_id>', methods=['POST'])
def package_complete_files(task_id):
    try:
        data = request.get_json() or {}
        filename = normalize_zip_filename(data.get('filename'), f'certificates_{task_id}.zip')
        
        # 获取任务相关的文件路径
        docx_folder = os.path.join(UPLOAD_FOLDER, task_id)
        merged_pdf = os.path.join(MERGED_FOLDER, f'{task_id}_merged.pdf')
        complete_zip_path = os.path.join(COMPLETE_FOLDER, f'{task_id}_{filename}')
        
        log = f"开始生成完整压缩包，任务ID: {task_id}"
        print(log)
        if task_id in task_status and 'logs' in task_status[task_id]:
            task_status[task_id]['logs'].append(log)
        log = f"docx文件夹: {docx_folder}"
        print(log)
        if task_id in task_status and 'logs' in task_status[task_id]:
            task_status[task_id]['logs'].append(log)
        log = f"合并PDF: {merged_pdf}"
        print(log)
        if task_id in task_status and 'logs' in task_status[task_id]:
            task_status[task_id]['logs'].append(log)
        log = f"输出路径: {complete_zip_path}"
        print(log)
        if task_id in task_status and 'logs' in task_status[task_id]:
            task_status[task_id]['logs'].append(log)
        
        # 检查必要文件是否存在
        if not os.path.exists(docx_folder):
            return jsonify({'error': 'docx文件夹不存在'}), 404
        if not os.path.exists(merged_pdf):
            return jsonify({'error': '合并PDF文件不存在'}), 404
        
        # 创建完整压缩包：证书放根目录，原始记录和打印版证书放到单独文件夹
        file_count = 0
        with zipfile.ZipFile(complete_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            docx_count = add_docx_files_to_zip(zipf, docx_folder)
            file_count += docx_count
            log = f"添加docx文件数量: {docx_count}，原始记录已放入 原始记录/ 文件夹，打印版证书已放入 {PRINT_CERTIFICATE_FOLDER_NAME}/ 文件夹"
            print(log)
            if task_id in task_status and 'logs' in task_status[task_id]:
                task_status[task_id]['logs'].append(log)
            
            # 添加合并后的PDF文件到根目录
            if os.path.exists(merged_pdf):
                archive_path = "合并证书.pdf"
                zipf.write(merged_pdf, archive_path)
                log = f"添加合并PDF文件: {archive_path}"
                print(log)
                if task_id in task_status and 'logs' in task_status[task_id]:
                    task_status[task_id]['logs'].append(log)
                file_count += 1
        
        # 更新任务状态
        if task_id in task_status:
            task_status[task_id]['package_done'] = True
            task_status[task_id]['complete_zip_path'] = complete_zip_path
        
        log = f"完整压缩包生成成功: {complete_zip_path}"
        print(log)
        if task_id in task_status and 'logs' in task_status[task_id]:
            task_status[task_id]['logs'].append(log)
        log = f"原始记录已放入压缩包内的 原始记录/ 文件夹，打印版证书已放入 {PRINT_CERTIFICATE_FOLDER_NAME}/ 文件夹"
        print(log)
        if task_id in task_status and 'logs' in task_status[task_id]:
            task_status[task_id]['logs'].append(log)
        log = f"包含文件数量: {file_count}"
        print(log)
        if task_id in task_status and 'logs' in task_status[task_id]:
            task_status[task_id]['logs'].append(log)
        
        return jsonify({
            'status': 'success',
            'message': '完整压缩包生成成功',
            'filename': filename,
            'file_count': file_count
        })
        
    except Exception as e:
        log = f"生成完整压缩包失败: {str(e)}"
        print(log)
        if task_id in task_status and 'logs' in task_status[task_id]:
            task_status[task_id]['logs'].append(log)
        return jsonify({
            'status': 'error',
            'message': f'生成完整压缩包失败: {str(e)}'
        }), 500

@app.route('/download/<task_id>/<filetype>', methods=['GET'])
def download_file(task_id, filetype):
    try:
        if not is_valid_task_id(task_id):
            return jsonify({'error': '任务ID无效'}), 400

        if filetype == 'merged':
            file_path = os.path.join(MERGED_FOLDER, f'{task_id}_merged.pdf')
        elif filetype == 'pdfs':
            file_path = os.path.join(PDF_FOLDER, task_id)
            # 可打包为 zip 返回
            shutil.make_archive(file_path, 'zip', file_path)
            file_path += '.zip'
        elif filetype == 'docx':
            filename = normalize_zip_filename(request.args.get('filename'), f'certificates_{task_id}.zip')
            docx_folder = os.path.join(UPLOAD_FOLDER, task_id)
            file_path = os.path.join(UPLOAD_FOLDER, f'{task_id}_{filename}')

            if not os.path.exists(docx_folder):
                return jsonify({'error': 'docx文件夹不存在'}), 404

            with zipfile.ZipFile(file_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                add_docx_files_to_zip(zipf, docx_folder)

            return send_file(
                file_path,
                as_attachment=True,
                download_name=filename,
                mimetype='application/zip'
            )
        elif filetype == 'complete':
            # 新增：下载完整压缩包
            filename = normalize_zip_filename(request.args.get('filename'), f'certificates_{task_id}.zip')
            file_path = os.path.join(COMPLETE_FOLDER, f'{task_id}_{filename}')
            
            if not os.path.exists(file_path):
                return jsonify({
                    'status': 'error',
                    'message': '完整压缩包不存在，请稍后重试'
                }), 404
            
            return send_file(
                file_path,
                as_attachment=True,
                download_name=filename,
                mimetype='application/zip'
            )
        elif filetype == 'converted':
            filename = normalize_zip_filename(request.args.get('filename'), '转换后的PDF.zip')
            file_path = os.path.join(COMPLETE_FOLDER, f'{task_id}_converted-pdfs.zip')

            if not os.path.exists(file_path):
                return jsonify({'error': '转换结果不存在，请稍后重试'}), 404

            return send_file(
                file_path,
                as_attachment=True,
                download_name=filename,
                mimetype='application/zip'
            )
        else:
            return jsonify({'error': '文件类型错误'}), 400
        
        if not os.path.exists(file_path):
            return jsonify({'error': '文件不存在'}), 404
            
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        log = f"下载文件失败: {str(e)}"
        print(log)
        if task_id in task_status and 'logs' in task_status[task_id]:
            task_status[task_id]['logs'].append(log)
        return jsonify({'error': f'下载失败: {str(e)}'}), 500

# 新增：强制完成任务的接口（用于仅生成证书模式）
@app.route('/force-complete/<task_id>', methods=['POST'])
def force_complete_task(task_id):
    try:
        log = f"强制标记任务完成，任务ID: {task_id}"
        print(log)
        if task_id in task_status and 'logs' in task_status[task_id]:
            task_status[task_id]['logs'].append(log)
        
        # 更新任务状态为完成
        if task_id in task_status:
            task_status[task_id]['done'] = True
            task_status[task_id]['convert_done'] = False  # 未转换PDF
            task_status[task_id]['merge_done'] = False    # 未合并PDF
            task_status[task_id]['package_done'] = False  # 未生成完整包
        
        return jsonify({
            'status': 'success',
            'message': '任务已标记为完成',
            'task_id': task_id
        })
        
    except Exception as e:
        log = f"强制完成任务失败: {str(e)}"
        print(log)
        if task_id in task_status and 'logs' in task_status[task_id]:
            task_status[task_id]['logs'].append(log)
        return jsonify({
            'status': 'error',
            'message': f'强制完成失败: {str(e)}'
        }), 500

if __name__ == '__main__':
    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_PORT', '5000'))
    print("=" * 50)
    print("证书生成服务启动中...")
    print(f"服务地址: http://{host}:{port}")
    print(f"健康检查: http://{host}:{port}/health")
    print("=" * 50)
    app.run(host=host, port=port, debug=False, threaded=True)
