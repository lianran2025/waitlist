import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const taskId = params.taskId;
  
  console.log(`[重置任务] 尝试重置任务状态: ${taskId}`);
  
  try {
    // 先尝试调用Windows服务器的重置接口（如果有的话）
    const resetUrl = `http://139.196.115.44:5000/reset/${taskId}`;
    console.log(`[重置任务] 调用重置接口: ${resetUrl}`);
    
    try {
      const resetResponse = await fetch(resetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (resetResponse.ok) {
        const resetData = await resetResponse.json();
        console.log(`[重置任务] 重置成功:`, resetData);
        return NextResponse.json({
          success: true,
          message: '任务状态已重置',
          taskId,
          resetData
        });
      } else {
        console.log(`[重置任务] 重置接口不存在或失败: ${resetResponse.status}`);
      }
    } catch (resetError) {
      console.log(`[重置任务] 重置接口调用失败:`, resetError);
    }

    // 如果重置接口不存在，尝试强制刷新状态
    const progressUrl = `http://139.196.115.44:5000/progress/${taskId}`;
    console.log(`[重置任务] 强制刷新状态: ${progressUrl}`);
    
    const response = await fetch(progressUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Windows服务器响应错误: ${response.status}`);
    }

    const currentData = await response.json();
    console.log(`[重置任务] 当前状态:`, JSON.stringify(currentData, null, 2));

    return NextResponse.json({
      success: true,
      message: '已强制刷新状态',
      taskId,
      currentState: currentData,
      suggestions: [
        '如果状态仍然没有更新，请检查Windows服务器日志',
        '可能需要重启Windows服务器上的Python服务',
        '检查任务ID是否正确匹配'
      ]
    });

  } catch (error) {
    console.error('[重置任务] 操作失败:', error);
    return NextResponse.json({ 
      success: false,
      error: '重置任务失败',
      details: error instanceof Error ? error.message : '未知错误',
      taskId
    }, { status: 500 });
  }
} 