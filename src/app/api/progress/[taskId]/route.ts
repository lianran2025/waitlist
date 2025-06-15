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

    // 智能判断任务是否真正完成
    // 如果Windows服务器状态标志有问题，我们通过其他指标来判断
    const isReallyComplete = (
      explicitDone || 
      (convertDone && mergeDone && packageDone) ||
      // 如果有结果文件且数量匹配，认为完成
      (hasResults && completedFiles >= expectedFiles && expectedFiles > 0) ||
      // 如果current等于total且都大于0，也认为至少转换完成
      (data.current > 0 && data.current >= data.total && data.total > 0)
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
        logs: data.logs || []
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