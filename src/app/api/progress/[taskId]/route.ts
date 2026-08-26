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
    const winApi = process.env.WINDOWS_API_URL || 'http://127.0.0.1:5000'
    const backendUrl = `${winApi}/progress/${taskId}`
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      // 禁用缓存
      cache: 'no-store',
      // 设置超时
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      throw new Error(`后端服务器响应错误: ${response.status}`)
    }

    const data = await response.json()
    
    // 添加详细的日志调试
    console.log(`[API代理] TaskId: ${taskId}`)
    console.log(`[API代理] 原始数据:`, JSON.stringify(data, null, 2))
    
    // 处理错误响应
    if (data.error) {
      console.log(`[API代理] 错误响应: ${data.error}`)
      return NextResponse.json({
        error: data.error,
        status: 'error',
        message: data.error
      }, { status: 500 })
    }

    if (data.mode === 'folder_conversion') {
      const total = Number(data.total) || 0
      const current = Number(data.current) || 0
      const successCount = Number(data.success_count) || 0
      const failureCount = Number(data.failure_count) || 0
      const archiveDone = data.archive_done === true
      const done = data.done === true
      const failed = done && !archiveDone
      const cleanupDone = data.source_cleanup_done === true && data.pdf_cleanup_done === true

      let progress = 10
      let message = data.queued ? '任务已进入队列，正在等待 Word 转换服务...' : '正在准备转换...'

      if (current > 0 && total > 0) {
        progress = 10 + Math.round((current / total) * 75)
        message = `正在转换第 ${current} / ${total} 个文件`
        if (data.current_file) {
          message += `：${data.current_file}`
        }
      }
      if (data.convert_done && !archiveDone) {
        progress = 90
        message = '转换完成，正在生成 PDF 压缩包...'
      }
      if (archiveDone) {
        progress = 100
        message = !cleanupDone
          ? 'PDF ZIP 已生成，但服务器临时文件清理失败，请联系管理员'
          : failureCount > 0
          ? `处理完成：${successCount} 个成功，${failureCount} 个失败`
          : `处理完成：${successCount} 个文件已转换并打包`
      } else if (failed) {
        progress = 100
        message = data.error || '转换失败，未生成可下载的 ZIP'
      }

      return NextResponse.json({
        taskId,
        progress,
        message,
        status: failed ? 'failed' : archiveDone && done ? 'completed' : 'processing',
        raw: {
          mode: data.mode,
          current,
          total,
          current_file: data.current_file || '',
          results: Array.isArray(data.results) ? data.results : [],
          success_count: successCount,
          failure_count: failureCount,
          convert_done: data.convert_done === true,
          archive_done: archiveDone,
          source_cleanup_done: data.source_cleanup_done === true,
          pdf_cleanup_done: data.pdf_cleanup_done === true,
          cleanup_error: data.cleanup_error || '',
          done,
          error: data.error || '',
          logs: Array.isArray(data.logs) ? data.logs : [],
        },
      })
    }

    // 转换Windows服务器的响应格式为前端期望的格式
    const convertDone = data.convert_done || false
    const mergeDone = data.merge_done || false
    const packageDone = data.package_done || false
    const explicitDone = data.done || false
    
    // 检查结果文件数量来判断是否真正完成
    const hasResults = data.results && Array.isArray(data.results) && data.results.length > 0
    const expectedFiles = data.total || 0
    const completedFiles = data.results?.length || 0
    
    console.log(`[API代理] 状态解析:`)
    console.log(`  - convert_done: ${convertDone}`)
    console.log(`  - merge_done: ${mergeDone}`)
    console.log(`  - package_done: ${packageDone}`)
    console.log(`  - explicit_done: ${explicitDone}`)
    console.log(`  - current: ${data.current}, total: ${data.total}`)
    console.log(`  - results: ${completedFiles}/${expectedFiles}`)
    console.log(`  - has_results: ${hasResults}`)

    // 严格判断任务是否真正完成
    // 只有当所有步骤都完成时才认为任务完成
    const isReallyComplete = (
      explicitDone && 
      convertDone && 
      mergeDone && 
      packageDone &&
      data.complete_zip_path // 必须有完整压缩包路径
    )

    console.log(`[API代理] 完成状态判断: ${isReallyComplete}`)

    // 计算进度百分比
    let progress = 0
    let message = '正在初始化...'

    if (isReallyComplete) {
      // 任务真正完成
      progress = 100
      message = '处理完成，可以下载了！'
      console.log(`[API代理] 任务真正完成！`)
    } else if (packageDone) {
      // 打包完成，等待最终确认
      progress = 95
      message = '正在完成最后步骤...'
      console.log(`[API代理] 打包完成，等待最终确认`)
    } else if (mergeDone) {
      // 合并完成，正在打包
      progress = 85
      message = '正在生成完整压缩包...'
      console.log(`[API代理] 合并完成，等待打包`)
    } else if (convertDone || (data.current > 0 && data.current >= data.total)) {
      // 转换完成，正在合并
      progress = 70
      message = '正在合并PDF文件...'
      console.log(`[API代理] 转换完成，等待合并`)
    } else if (data.current > 0 && data.total > 0) {
      // 正在转换
      progress = 20 + Math.round((data.current / data.total) * 40) // 20% - 60%
      message = `正在转换第 ${data.current} / ${data.total} 个文件`
      if (data.current_file) {
        message += `: ${data.current_file}`
      }
      console.log(`[API代理] 正在转换: ${data.current}/${data.total}`)
    } else {
      // 初始状态
      progress = 15
      message = '后台正在处理，请耐心等待...'
      console.log(`[API代理] 初始状态或等待中`)
    }

    const allDone = isReallyComplete

    const result = {
      taskId,
      progress,
      message,
      status: allDone ? 'completed' : 'processing',
      // 保留原始数据供调试
      raw: {
        current: data.current || 0,
        total: data.total || 0,
        current_file: data.current_file || '',
        convert_done: convertDone,
        merge_done: mergeDone,
        package_done: packageDone,
        done: allDone,
        logs: data.logs || [],
        complete_zip_path: data.complete_zip_path || '', // 保留完整压缩包路径
        folder_name: data.folder_name || '' // 保留文件夹名称
      }
    }
    
    console.log(`[API代理] 最终返回:`, JSON.stringify(result, null, 2))

    // 返回标准化的响应格式
    return NextResponse.json(result)

  } catch (error) {
    console.error('进度查询代理错误:', error)
    return NextResponse.json(
      { 
        error: '查询进度失败', 
        details: error instanceof Error ? error.message : String(error),
        status: 'error',
        message: '查询进度失败，请稍后重试'
      },
      { status: 500 }
    )
  }
} 
