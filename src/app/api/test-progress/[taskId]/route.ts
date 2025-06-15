import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params
    
    if (!taskId) {
      return NextResponse.json(
        { error: '任务ID是必填的' },
        { status: 400 }
      )
    }

    // 直接访问Windows服务器
    const backendUrl = `http://139.196.115.44:5000/progress/${taskId}`
    
    console.log(`[测试接口] 请求URL: ${backendUrl}`)
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000)
    })

    console.log(`[测试接口] 响应状态: ${response.status}`)

    if (!response.ok) {
      throw new Error(`后端服务器响应错误: ${response.status}`)
    }

    const data = await response.json()
    
    console.log(`[测试接口] 原始响应数据:`)
    console.log(JSON.stringify(data, null, 2))

    // 直接返回原始数据，不做任何处理
    return NextResponse.json({
      taskId,
      timestamp: new Date().toISOString(),
      backendUrl,
      status: response.status,
      rawData: data
    })

  } catch (error) {
    console.error('[测试接口] 错误:', error)
    return NextResponse.json(
      { 
        error: '测试请求失败', 
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 