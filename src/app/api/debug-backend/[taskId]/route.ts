import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const taskId = params.taskId;
  
  console.log(`[调试工具] 直接查询Windows服务器状态: ${taskId}`);
  
  try {
    const backendUrl = `http://139.196.115.44:5000/progress/${taskId}`;
    console.log(`[调试工具] 请求URL: ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    console.log(`[调试工具] 响应状态: ${response.status}`);
    
    if (!response.ok) {
      console.log(`[调试工具] 请求失败: ${response.status} ${response.statusText}`);
      return NextResponse.json({ 
        error: `后台服务器响应错误: ${response.status}`,
        taskId,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    const rawData = await response.json();
    console.log(`[调试工具] 原始数据:`, JSON.stringify(rawData, null, 2));

    // 直接返回原始数据，不做任何处理
    return NextResponse.json({
      taskId,
      timestamp: new Date().toISOString(),
      serverUrl: backendUrl,
      rawResponse: rawData,
      status: 'debug'
    });

  } catch (error) {
    console.error('[调试工具] 请求失败:', error);
    return NextResponse.json({ 
      error: '无法连接到后台服务器',
      details: error instanceof Error ? error.message : '未知错误',
      taskId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 