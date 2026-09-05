import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function encodeRFC5987ValueChars(value: string): string {
  return encodeURIComponent(value)
    .replace(/['()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, '%2A')
}

function createContentDisposition(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeRFC5987ValueChars(filename)}`
}

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
    const winApi = process.env.WINDOWS_API_URL || 'http://127.0.0.1:5000'
    let backendUrl = `${winApi}/download/${taskId}/${type}`
    if (filename) {
      backendUrl += `?filename=${encodeURIComponent(filename)}`
    }
    
    console.log(`[下载代理] 后端URL: ${backendUrl}`)
    
    // 代理请求到 Windows 服务器。大文件必须流式转发，不能先读入 Node 内存。
    // 同时透传 Range，浏览器才可以在网络中断后发起断点续传。
    const upstreamHeaders = new Headers({
      'User-Agent': 'NextJS-Download-Proxy'
    })
    for (const headerName of ['range', 'if-range']) {
      const value = request.headers.get(headerName)
      if (value) {
        upstreamHeaders.set(headerName, value)
      }
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: upstreamHeaders
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
    
    if (!response.body) {
      throw new Error('后端下载响应没有文件流')
    }

    // 保留与文件传输/断点续传有关的响应头，避免把 Flask 的 206 响应错误改为 200。
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const contentDisposition = response.headers.get('content-disposition')
    const proxyHeaders = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'private, no-store'
    })

    for (const headerName of ['content-length', 'content-range', 'accept-ranges']) {
      const value = response.headers.get(headerName)
      if (value) {
        proxyHeaders.set(headerName, value)
      }
    }

    console.log(
      `[下载代理] 流式转发: 状态=${response.status}, 长度=${response.headers.get('content-length') || '未知'}, Range=${request.headers.get('range') || '无'}`
    )

    // response.body 会在数据到达时立即转给浏览器，不再创建完整 ZIP 的内存副本。
    const proxyResponse = new NextResponse(response.body, {
      status: response.status,
      headers: proxyHeaders
    })
    
    if (filename) {
      proxyResponse.headers.set('Content-Disposition', createContentDisposition(filename))
    } else if (contentDisposition) {
      proxyResponse.headers.set('Content-Disposition', contentDisposition)
    }
    
    console.log(`[下载代理] 流式代理响应已创建`)
    return proxyResponse
    
  } catch (error) {
    console.error('[下载代理] 请求失败:', error)
    return NextResponse.json({
      error: '下载代理失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 
