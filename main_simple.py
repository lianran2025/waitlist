from flask_cors import CORS
from flask import Flask, request, send_file, jsonify
import os
from PyPDF2 import PdfMerger
import uuid
import shutil
import zipfile

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
PDF_FOLDER = 'pdfs'
MERGED_FOLDER = 'merged'
COMPLETE_FOLDER = 'complete'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PDF_FOLDER, exist_ok=True)
os.makedirs(MERGED_FOLDER, exist_ok=True)
os.makedirs(COMPLETE_FOLDER, exist_ok=True)

task_status = {}

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'status': 'running',
        'message': '证书生成服务正在运行（简化版）',
        'version': '2.0-simple',
        'note': 'docx2pdf功能暂时禁用，请手动转换PDF后上传',
        'endpoints': [
            'POST /upload - 上传文件',
            'POST /upload_pdfs - 上传PDF文件',
            'POST /merge/<task_id> - 合并PDF',
            'POST /package/<task_id> - 生成完整压缩包',
            'GET /progress/<task_id> - 查询进度',
            'GET /download/<task_id>/<filetype> - 下载文件'
        ]
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': str(uuid.uuid4()),
        'active_tasks': len(task_status)
    })

@app.route('/upload', methods=['POST'])
def upload_files():
    try:
        files = request.files.getlist('files')
        if not files:
            return jsonify({'error': '没有上传文件'}), 400
        
        task_id = str(uuid.uuid4())
        task_folder = os.path.join(UPLOAD_FOLDER, task_id)
        os.makedirs(task_folder, exist_ok=True)
        
        uploaded_count = 0
        for file in files:
            if file.filename:
                file.save(os.path.join(task_folder, file.filename))
                uploaded_count += 1
        
        # 初始化任务状态
        task_status[task_id] = {
            'total': uploaded_count,
            'current': uploaded_count,
            'current_file': '上传完成',
            'results': [],
            'done': False,
            'convert_done': True,  # 跳过转换步骤
            'merge_done': False,
            'package_done': False
        }
        
        print(f"上传成功，任务ID: {task_id}，文件数量: {uploaded_count}")
        return jsonify({
            'task_id': task_id, 
            'msg': '上传成功',
            'file_count': uploaded_count,
            'note': '请手动转换PDF后调用merge接口'
        })
    except Exception as e:
        print(f"上传文件失败: {str(e)}")
        return jsonify({'error': f'上传失败: {str(e)}'}), 500

@app.route('/upload_pdfs/<task_id>', methods=['POST'])
def upload_pdfs(task_id):
    """新增：直接上传PDF文件的接口"""
    try:
        files = request.files.getlist('files')
        if not files:
            return jsonify({'error': '没有上传PDF文件'}), 400
        
        pdf_task_folder = os.path.join(PDF_FOLDER, task_id)
        os.makedirs(pdf_task_folder, exist_ok=True)
        
        uploaded_count = 0
        for file in files:
            if file.filename and file.filename.endswith('.pdf'):
                file.save(os.path.join(pdf_task_folder, file.filename))
                uploaded_count += 1
        
        print(f"PDF上传成功，任务ID: {task_id}，PDF数量: {uploaded_count}")
        return jsonify({
            'msg': 'PDF上传成功',
            'pdf_count': uploaded_count,
            'task_id': task_id
        })
    except Exception as e:
        print(f"PDF上传失败: {str(e)}")
        return jsonify({'error': f'PDF上传失败: {str(e)}'}), 500

@app.route('/convert/<task_id>', methods=['POST'])
def convert_to_pdf(task_id):
    """转换接口 - 简化版中返回提示信息"""
    return jsonify({
        'error': '简化版不支持自动转换',
        'message': '请手动将docx转换为PDF后使用upload_pdfs接口上传',
        'task_id': task_id
    }), 501

@app.route('/progress/<task_id>', methods=['GET'])
def get_progress(task_id):
    status = task_status.get(task_id)
    if not status:
        return jsonify({'error': '任务不存在'}), 404
    
    all_done = status.get('convert_done', False) and status.get('merge_done', False) and status.get('package_done', False)
    status['done'] = all_done
    
    return jsonify(status)

@app.route('/merge/<task_id>', methods=['POST'])
def merge_pdfs(task_id):
    try:
        pdf_task_folder = os.path.join(PDF_FOLDER, task_id)
        if not os.path.exists(pdf_task_folder):
            return jsonify({'error': 'PDF文件夹不存在，请先上传PDF文件'}), 404
            
        merged_file = os.path.join(MERGED_FOLDER, f'{task_id}_merged.pdf')
        merger = PdfMerger()
        pdfs = [f for f in sorted(os.listdir(pdf_task_folder)) if f.endswith('.pdf')]
        
        print(f"合并PDF，任务ID: {task_id}，PDF数量: {len(pdfs)}")
        
        if not pdfs:
            return jsonify({'error': '没有找到PDF文件'}), 400
        
        for filename in pdfs:
            pdf_path = os.path.join(pdf_task_folder, filename)
            print(f"合并文件: {filename}")
            try:
                merger.append(pdf_path)
            except Exception as e:
                print(f"合并文件失败 {filename}: {str(e)}")
                continue
        
        merger.write(merged_file)
        merger.close()
        print(f"合并完成，输出文件: {merged_file}")
        
        if task_id in task_status:
            task_status[task_id]['merge_done'] = True
        
        return jsonify({
            'msg': '合并完成', 
            'merged_file': merged_file,
            'pdf_count': len(pdfs)
        })
    except Exception as e:
        print(f"合并PDF失败: {str(e)}")
        return jsonify({'error': f'合并失败: {str(e)}'}), 500

@app.route('/package/<task_id>', methods=['POST'])
def package_complete_files(task_id):
    try:
        data = request.get_json() or {}
        filename = data.get('filename', f'certificates_{task_id}.zip')
        folder_name = filename.replace('.zip', '') if filename.endswith('.zip') else filename
        
        docx_folder = os.path.join(UPLOAD_FOLDER, task_id)
        merged_pdf = os.path.join(MERGED_FOLDER, f'{task_id}_merged.pdf')
        complete_zip_path = os.path.join(COMPLETE_FOLDER, f'{task_id}_{filename}')
        
        print(f"开始生成完整压缩包，任务ID: {task_id}")
        
        if not os.path.exists(merged_pdf):
            return jsonify({'error': '合并PDF文件不存在，请先执行合并操作'}), 404
        
        file_count = 0
        with zipfile.ZipFile(complete_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 添加原始文件
            if os.path.exists(docx_folder):
                for file in os.listdir(docx_folder):
                    if not file.startswith('~$'):
                        file_path = os.path.join(docx_folder, file)
                        archive_path = f"{folder_name}/{file}"
                        zipf.write(file_path, archive_path)
                        print(f"添加文件到文件夹: {archive_path}")
                        file_count += 1
            
            # 添加合并PDF
            archive_path = f"{folder_name}/合并证书.pdf"
            zipf.write(merged_pdf, archive_path)
            print(f"添加合并PDF文件到文件夹: {archive_path}")
            file_count += 1
        
        if task_id in task_status:
            task_status[task_id]['package_done'] = True
            task_status[task_id]['complete_zip_path'] = complete_zip_path
            task_status[task_id]['folder_name'] = folder_name
        
        print(f"完整压缩包生成成功: {complete_zip_path}")
        
        return jsonify({
            'status': 'success',
            'message': '完整压缩包生成成功',
            'filename': filename,
            'folder_name': folder_name,
            'file_count': file_count
        })
        
    except Exception as e:
        print(f"生成完整压缩包失败: {str(e)}")
        return jsonify({'error': f'生成完整压缩包失败: {str(e)}'}), 500

@app.route('/download/<task_id>/<filetype>', methods=['GET'])
def download_file(task_id, filetype):
    try:
        if filetype == 'merged':
            file_path = os.path.join(MERGED_FOLDER, f'{task_id}_merged.pdf')
        elif filetype == 'complete':
            filename = request.args.get('filename', f'certificates_{task_id}.zip')
            file_path = os.path.join(COMPLETE_FOLDER, f'{task_id}_{filename}')
            
            if not os.path.exists(file_path):
                return jsonify({'error': '完整压缩包不存在'}), 404
            
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
        print(f"下载文件失败: {str(e)}")
        return jsonify({'error': f'下载失败: {str(e)}'}), 500

if __name__ == '__main__':
    print("=" * 50)
    print("证书生成服务启动中（简化版）...")
    print("服务地址: http://0.0.0.0:5000")
    print("注意: docx2pdf功能暂时禁用")
    print("请手动转换PDF后使用upload_pdfs接口")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=False) 