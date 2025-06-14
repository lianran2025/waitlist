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

    // 代理请求到后端服务器
    const backendUrl = `http://139.196.115.44:5000/progress/${taskId}`
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // 设置超时
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      throw new Error(`后端服务器响应错误: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('进度查询代理错误:', error)
    return NextResponse.json(
      { error: '查询进度失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 