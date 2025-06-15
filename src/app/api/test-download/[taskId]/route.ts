import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename') || '证书包.zip'
    
    console.log(`[测试下载] TaskId: ${taskId}`)
    console.log(`[测试下载] 文件名: ${filename}`)
    
    // 构建下载URL
    const downloadUrl = `http://139.196.115.44:5000/download/${taskId}/complete?filename=${encodeURIComponent(filename)}`
    console.log(`[测试下载] 下载URL: ${downloadUrl}`)
    
    // 测试连接
    const response = await fetch(downloadUrl, {
      method: 'HEAD', // 只获取头部信息
      headers: {
        'User-Agent': 'NextJS-Test-Client'
      }
    })
    
    console.log(`[测试下载] 响应状态: ${response.status}`)
    console.log(`[测试下载] 响应头:`, Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      // 如果HEAD请求成功，返回下载信息
      return NextResponse.json({
        status: 'success',
        downloadUrl,
        filename,
        taskId,
        serverResponse: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      })
    } else {
      // 如果失败，返回错误信息
      const errorText = await response.text().catch(() => '无法获取错误信息')
      return NextResponse.json({
        status: 'error',
        downloadUrl,
        filename,
        taskId,
        error: `服务器响应错误: ${response.status} ${response.statusText}`,
        errorDetails: errorText,
        serverResponse: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      }, { status: response.status })
    }
    
  } catch (error) {
    console.error('[测试下载] 请求失败:', error)
    return NextResponse.json({
      status: 'error',
      error: '连接Windows服务器失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 