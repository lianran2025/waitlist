from flask_cors import CORS
from flask import Flask, request, send_file, jsonify
import os
from docx2pdf import convert
from PyPDF2 import PdfMerger
import uuid
import shutil
import logging
import pythoncom
import zipfile

app = Flask(__name__)
CORS(app)  # 允许所有跨域请求，生产环境可指定 origins

UPLOAD_FOLDER = 'uploads'
PDF_FOLDER = 'pdfs'
MERGED_FOLDER = 'merged'
COMPLETE_FOLDER = 'complete'  # 新增：完整压缩包文件夹
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PDF_FOLDER, exist_ok=True)
os.makedirs(MERGED_FOLDER, exist_ok=True)
os.makedirs(COMPLETE_FOLDER, exist_ok=True)

# 全局任务进度字典
task_status = {}

@app.route('/upload', methods=['POST'])
def upload_files():
    files = request.files.getlist('files')
    task_id = str(uuid.uuid4())
    task_folder = os.path.join(UPLOAD_FOLDER, task_id)
    os.makedirs(task_folder, exist_ok=True)
    for file in files:
        file.save(os.path.join(task_folder, file.filename))
    return jsonify({'task_id': task_id, 'msg': '上传成功'})

@app.route('/convert/<task_id>', methods=['POST'])
def convert_to_pdf(task_id):
    task_folder = os.path.join(UPLOAD_FOLDER, task_id)
    pdf_task_folder = os.path.join(PDF_FOLDER, task_id)
    os.makedirs(pdf_task_folder, exist_ok=True)
    files = [f for f in os.listdir(task_folder) if f.endswith('.docx') and not f.startswith('~$')]
    total = len(files)
    # 初始化进度
    task_status[task_id] = {
        'total': total,
        'current': 0,
        'current_file': '',
        'results': [],
        'done': False,
        'convert_done': False,
        'merge_done': False,
        'package_done': False
    }
    results = []
    for idx, filename in enumerate(files):
        src = os.path.abspath(os.path.join(task_folder, filename))
        dst = os.path.abspath(os.path.join(pdf_task_folder, filename.replace('.docx', '.pdf')))
        # 实时更新进度
        task_status[task_id]['current'] = idx + 1
        task_status[task_id]['current_file'] = filename
        try:
            pythoncom.CoInitialize()
            convert(src, dst)
            pythoncom.CoUninitialize()
            if os.path.exists(dst):
                result = {'file': filename, 'status': 'success'}
            else:
                result = {'file': filename, 'status': 'fail', 'reason': 'No PDF generated'}
        except Exception as e:
            result = {'file': filename, 'status': 'fail', 'reason': str(e)}
        results.append(result)
        task_status[task_id]['results'] = results.copy()
    
    # 标记转换完成
    task_status[task_id]['convert_done'] = True
    task_status[task_id]['done'] = False  # 整体还未完成
    return jsonify({'msg': '转换完成', 'results': results, 'pdf_folder': pdf_task_folder})

@app.route('/progress/<task_id>', methods=['GET'])
def get_progress(task_id):
    status = task_status.get(task_id)
    if not status:
        return jsonify({'error': '任务不存在'}), 404
    
    # 计算整体完成状态
    all_done = status.get('convert_done', False) and status.get('merge_done', False) and status.get('package_done', False)
    status['done'] = all_done
    
    return jsonify(status)

@app.route('/merge/<task_id>', methods=['POST'])
def merge_pdfs(task_id):
    pdf_task_folder = os.path.join(PDF_FOLDER, task_id)
    merged_file = os.path.join(MERGED_FOLDER, f'{task_id}_merged.pdf')
    merger = PdfMerger()
    pdfs = [f for f in sorted(os.listdir(pdf_task_folder)) if f.endswith('.pdf')]
    print(f"合并PDF，任务ID: {task_id}，PDF数量: {len(pdfs)}")
    if not pdfs:
        print("没有可合并的 PDF 文件")
        return jsonify({'msg': '没有可合并的 PDF 文件', 'merged_file': None}), 400
    for filename in pdfs:
        print(f"合并文件: {filename}")
        merger.append(os.path.join(pdf_task_folder, filename))
    merger.write(merged_file)
    merger.close()
    print(f"合并完成，输出文件: {merged_file}")
    
    # 更新任务状态
    if task_id in task_status:
        task_status[task_id]['merge_done'] = True
    
    return jsonify({'msg': '合并完成', 'merged_file': merged_file})

# 新增：生成完整压缩包接口
@app.route('/package/<task_id>', methods=['POST'])
def package_complete_files(task_id):
    try:
        data = request.get_json() or {}
        filename = data.get('filename', f'certificates_{task_id}.zip')
        
        # 从文件名中提取文件夹名称（去掉.zip后缀）
        folder_name = filename.replace('.zip', '') if filename.endswith('.zip') else filename
        
        # 获取任务相关的文件路径
        docx_folder = os.path.join(UPLOAD_FOLDER, task_id)
        merged_pdf = os.path.join(MERGED_FOLDER, f'{task_id}_merged.pdf')
        complete_zip_path = os.path.join(COMPLETE_FOLDER, f'{task_id}_{filename}')
        
        print(f"开始生成完整压缩包，任务ID: {task_id}")
        print(f"文件夹名称: {folder_name}")
        print(f"docx文件夹: {docx_folder}")
        print(f"合并PDF: {merged_pdf}")
        print(f"输出路径: {complete_zip_path}")
        
        # 创建完整压缩包，所有文件都放在指定文件夹内
        with zipfile.ZipFile(complete_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 添加所有docx文件到文件夹内
            if os.path.exists(docx_folder):
                for file in os.listdir(docx_folder):
                    if file.endswith('.docx') and not file.startswith('~$'):
                        file_path = os.path.join(docx_folder, file)
                        # 将文件放在文件夹内：文件夹名/文件名
                        archive_path = f"{folder_name}/{file}"
                        zipf.write(file_path, archive_path)
                        print(f"添加docx文件到文件夹: {archive_path}")
            
            # 添加合并后的PDF文件到文件夹内
            if os.path.exists(merged_pdf):
                # 将PDF文件放在文件夹内：文件夹名/合并证书.pdf
                archive_path = f"{folder_name}/合并证书.pdf"
                zipf.write(merged_pdf, archive_path)
                print(f"添加合并PDF文件到文件夹: {archive_path}")
        
        # 更新任务状态
        if task_id in task_status:
            task_status[task_id]['package_done'] = True
            task_status[task_id]['complete_zip_path'] = complete_zip_path
            task_status[task_id]['folder_name'] = folder_name
        
        print(f"完整压缩包生成成功: {complete_zip_path}")
        print(f"解压后将创建文件夹: {folder_name}")
        return jsonify({
            'status': 'success',
            'message': '完整压缩包生成成功',
            'filename': filename,
            'folder_name': folder_name
        })
        
    except Exception as e:
        print(f"生成完整压缩包失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'生成完整压缩包失败: {str(e)}'
        }), 500

@app.route('/download/<task_id>/<filetype>', methods=['GET'])
def download_file(task_id, filetype):
    if filetype == 'merged':
        file_path = os.path.join(MERGED_FOLDER, f'{task_id}_merged.pdf')
    elif filetype == 'pdfs':
        file_path = os.path.join(PDF_FOLDER, task_id)
        # 可打包为 zip 返回
        shutil.make_archive(file_path, 'zip', file_path)
        file_path += '.zip'
    elif filetype == 'docx':
        file_path = os.path.join(UPLOAD_FOLDER, task_id)
        shutil.make_archive(file_path, 'zip', file_path)
        file_path += '.zip'
    elif filetype == 'complete':
        # 新增：下载完整压缩包
        filename = request.args.get('filename', f'certificates_{task_id}.zip')
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
    else:
        return '文件类型错误', 400
    
    if not os.path.exists(file_path):
        return '文件不存在', 404
        
    return send_file(file_path, as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 