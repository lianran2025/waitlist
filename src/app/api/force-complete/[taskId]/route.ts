import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const taskId = params.taskId;
  
  console.log(`[强制完成] 处理任务: ${taskId}`);
  
  try {
    // 检查Windows服务器上的文件是否存在（使用正确的URL格式）
    const checkUrls = [
      `http://139.196.115.44:5000/download/${taskId}/docx`,
      `http://139.196.115.44:5000/download/${taskId}/merged`,
      `http://139.196.115.44:5000/download/${taskId}/complete?filename=test.zip`
    ];

    console.log(`[强制完成] 检查文件是否存在...`);
    
    const fileChecks = await Promise.all(
      checkUrls.map(async (url) => {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          return { url, exists: response.ok, status: response.status };
        } catch (error) {
          return { url, exists: false, error: error instanceof Error ? error.message : '未知错误' };
        }
      })
    );

    console.log(`[强制完成] 文件检查结果:`, fileChecks);

    // 检查是否有完整压缩包
    const completeZipCheck = fileChecks.find(check => check.url.includes('complete?filename='));
    const hasCompleteZip = completeZipCheck?.exists || false;

    if (hasCompleteZip) {
      console.log(`[强制完成] 发现完整压缩包，任务确实已完成`);
      
      // 构造完成状态的响应
      const completeResponse = {
        taskId,
        progress: 100,
        message: '处理完成，可以下载了！',
        status: 'completed',
        forceCompleted: true,
        downloadUrls: {
          docx: `http://139.196.115.44:5000/download/${taskId}/docx`,
          pdf: `http://139.196.115.44:5000/download/${taskId}/merged`,
          complete: `http://139.196.115.44:5000/download/${taskId}/complete?filename=证书包.zip`
        },
        fileChecks
      };

      return NextResponse.json(completeResponse);
    } else {
      console.log(`[强制完成] 完整压缩包不存在，任务可能未完成`);
      
      return NextResponse.json({
        taskId,
        success: false,
        message: '任务尚未完成或文件不存在',
        fileChecks
      }, { status: 404 });
    }

  } catch (error) {
    console.error('[强制完成] 操作失败:', error);
    return NextResponse.json({ 
      success: false,
      error: '检查任务状态失败',
      details: error instanceof Error ? error.message : '未知错误',
      taskId
    }, { status: 500 });
  }
} 