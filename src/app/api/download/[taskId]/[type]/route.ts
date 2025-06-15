import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string, type: string } }
) {
  try {
    const { taskId, type } = params
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    
    console.log(`[下载代理] TaskId: ${taskId}, Type: ${type}, Filename: ${filename}`)
    
    // 构建Windows服务器的下载URL
    let backendUrl = `http://139.196.115.44:5000/download/${taskId}/${type}`
    if (filename) {
      backendUrl += `?filename=${encodeURIComponent(filename)}`
    }
    
    console.log(`[下载代理] 后端URL: ${backendUrl}`)
    
    // 代理请求到Windows服务器
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'NextJS-Download-Proxy'
      }
    })
    
    console.log(`[下载代理] 后端响应状态: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '无法获取错误信息')
      console.error(`[下载代理] 后端错误: ${response.status} ${response.statusText}`)
      console.error(`[下载代理] 错误详情: ${errorText}`)
      
      return NextResponse.json({
        error: `下载失败: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status })
    }
    
    // 获取文件内容
    const fileBuffer = await response.arrayBuffer()
    console.log(`[下载代理] 文件大小: ${fileBuffer.byteLength} bytes`)
    
    // 获取原始响应头
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const contentDisposition = response.headers.get('content-disposition')
    
    console.log(`[下载代理] Content-Type: ${contentType}`)
    console.log(`[下载代理] Content-Disposition: ${contentDisposition}`)
    
    // 创建响应
    const proxyResponse = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
    // 如果有Content-Disposition头，保留它
    if (contentDisposition) {
      proxyResponse.headers.set('Content-Disposition', contentDisposition)
    } else if (filename) {
      // 如果没有Content-Disposition但有filename参数，创建一个
      proxyResponse.headers.set('Content-Disposition', `attachment; filename="${filename}"`)
    }
    
    console.log(`[下载代理] 代理响应已创建`)
    return proxyResponse
    
  } catch (error) {
    console.error('[下载代理] 请求失败:', error)
    return NextResponse.json({
      error: '下载代理失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 