# Flask服务器更新示例 - 需要在Windows服务器上实现的新接口
# 文件路径：Windows服务器上的Flask应用

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import zipfile
import tempfile
import shutil
from datetime import datetime

app = Flask(__name__)
CORS(app)

# 全局任务状态字典
task_status = {}

# 现有接口保持不变...
# /upload, /convert/{task_id}, /merge/{task_id}, /progress/{task_id}, /download/{task_id}/docx, /download/{task_id}/merged

@app.route('/package/<task_id>', methods=['POST'])
def package_complete_files(task_id):
    """
    新增接口：生成包含所有文件的完整压缩包
    """
    try:
        data = request.get_json()
        filename = data.get('filename', f'certificates_{task_id}.zip')
        
        # 获取任务相关的文件路径
        task_dir = f'tasks/{task_id}'
        docx_dir = f'{task_dir}/docx'
        merged_pdf = f'{task_dir}/merged/merged.pdf'
        complete_zip_path = f'{task_dir}/complete/{filename}'
        
        # 确保完整压缩包目录存在
        os.makedirs(f'{task_dir}/complete', exist_ok=True)
        
        # 创建完整压缩包
        with zipfile.ZipFile(complete_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 添加所有docx文件
            if os.path.exists(docx_dir):
                for file in os.listdir(docx_dir):
                    if file.endswith('.docx'):
                        file_path = os.path.join(docx_dir, file)
                        zipf.write(file_path, file)
            
            # 添加合并后的PDF文件
            if os.path.exists(merged_pdf):
                zipf.write(merged_pdf, 'merged_certificates.pdf')
        
        # 更新任务状态
        if task_id in task_status:
            task_status[task_id]['package_done'] = True
            task_status[task_id]['complete_zip_path'] = complete_zip_path
        
        return jsonify({
            'status': 'success',
            'message': '完整压缩包生成成功',
            'filename': filename
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'生成完整压缩包失败: {str(e)}'
        }), 500

@app.route('/download/<task_id>/complete', methods=['GET'])
def download_complete_package(task_id):
    """
    新增接口：下载完整压缩包
    """
    try:
        filename = request.args.get('filename', f'certificates_{task_id}.zip')
        complete_zip_path = f'tasks/{task_id}/complete/{filename}'
        
        if not os.path.exists(complete_zip_path):
            return jsonify({
                'status': 'error',
                'message': '完整压缩包不存在，请稍后重试'
            }), 404
        
        return send_file(
            complete_zip_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/zip'
        )
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'下载失败: {str(e)}'
        }), 500

@app.route('/progress/<task_id>', methods=['GET'])
def get_progress(task_id):
    """
    更新现有进度接口，添加打包状态
    """
    if task_id not in task_status:
        return jsonify({
            'status': 'error',
            'message': '任务不存在'
        }), 404
    
    status = task_status[task_id]
    
    # 计算总体进度
    total_steps = 3  # 转换、合并、打包
    completed_steps = 0
    
    if status.get('convert_done', False):
        completed_steps += 1
    if status.get('merge_done', False):
        completed_steps += 1
    if status.get('package_done', False):
        completed_steps += 1
    
    # 如果所有步骤都完成
    all_done = completed_steps == total_steps
    
    return jsonify({
        'task_id': task_id,
        'current': status.get('current', 0),
        'total': status.get('total', 0),
        'current_file': status.get('current_file', ''),
        'convert_done': status.get('convert_done', False),
        'merge_done': status.get('merge_done', False),
        'package_done': status.get('package_done', False),
        'done': all_done,
        'progress_percent': int((completed_steps / total_steps) * 100)
    })

# 清理任务文件的定时任务（可选）
def cleanup_old_tasks():
    """
    清理超过24小时的任务文件
    """
    tasks_dir = 'tasks'
    if not os.path.exists(tasks_dir):
        return
    
    current_time = datetime.now()
    for task_id in os.listdir(tasks_dir):
        task_path = os.path.join(tasks_dir, task_id)
        if os.path.isdir(task_path):
            # 检查文件夹创建时间
            creation_time = datetime.fromtimestamp(os.path.getctime(task_path))
            if (current_time - creation_time).total_seconds() > 24 * 3600:  # 24小时
                try:
                    shutil.rmtree(task_path)
                    if task_id in task_status:
                        del task_status[task_id]
                    print(f"清理过期任务: {task_id}")
                except Exception as e:
                    print(f"清理任务失败 {task_id}: {e}")

if __name__ == '__main__':
    # 创建必要的目录
    os.makedirs('tasks', exist_ok=True)
    
    # 启动应用
    app.run(host='0.0.0.0', port=5000, debug=False) 