import axios from 'axios'
import FormData from 'form-data'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_COUNT = 200
const MAX_FILE_SIZE = 100 * 1024 * 1024
const MAX_TOTAL_SIZE = 500 * 1024 * 1024

function isUploadedFile(entry: FormDataEntryValue): entry is File {
  return typeof entry !== 'string'
    && typeof entry.name === 'string'
    && typeof entry.arrayBuffer === 'function'
}

function validateRelativePath(value: string): string {
  const normalized = value.replace(/\\/g, '/')
  if (!normalized || normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
    throw new Error('检测到无效的文件路径')
  }

  const parts = normalized.split('/')
  if (parts.some(part => !part || part === '.' || part === '..')) {
    throw new Error('文件路径中包含非法目录')
  }

  if (!parts[parts.length - 1].toLowerCase().endsWith('.docx')) {
    throw new Error('只能上传 DOCX 文件')
  }

  return parts.join('/')
}

function getBackendMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const backendData = error.response?.data
    if (backendData && typeof backendData === 'object') {
      const candidate = backendData.error || backendData.message
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate
      }
    }
    if (error.code === 'ECONNABORTED') {
      return `${fallback}超时，请检查 Windows 转换服务`
    }
  }
  return error instanceof Error ? error.message : fallback
}

export async function POST(request: Request) {
  try {
    const incomingForm = await request.formData()
    const files = incomingForm.getAll('files').filter(isUploadedFile)
    const rawPaths = incomingForm.getAll('relative_paths')
    const zipNameEntry = incomingForm.get('zip_name')

    if (files.length === 0) {
      return NextResponse.json({ error: '请至少选择一个包含 DOCX 的文件夹' }, { status: 400 })
    }
    if (files.length > MAX_FILE_COUNT) {
      return NextResponse.json({ error: `一次最多转换 ${MAX_FILE_COUNT} 个 DOCX 文件` }, { status: 400 })
    }
    if (rawPaths.length !== files.length || rawPaths.some(path => typeof path !== 'string')) {
      return NextResponse.json({ error: '文件与目录信息不完整，请重新选择文件夹' }, { status: 400 })
    }

    const relativePaths = (rawPaths as string[]).map(validateRelativePath)
    const pathKeys = new Set<string>()
    let totalSize = 0

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      if (!file.name.toLowerCase().endsWith('.docx') || file.name.startsWith('~$')) {
        return NextResponse.json({ error: `不支持的文件: ${file.name}` }, { status: 400 })
      }
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `${file.name} 为空或超过 100 MB` }, { status: 400 })
      }

      totalSize += file.size
      const pathKey = relativePaths[index].toLocaleLowerCase('zh-CN')
      if (pathKeys.has(pathKey)) {
        return NextResponse.json({ error: `存在重复路径: ${relativePaths[index]}` }, { status: 400 })
      }
      pathKeys.add(pathKey)
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json({ error: '本次 DOCX 文件总大小不能超过 500 MB' }, { status: 400 })
    }

    const backendForm = new FormData()
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      backendForm.append('files', Buffer.from(await file.arrayBuffer()), {
        filename: file.name,
        contentType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      backendForm.append('relative_paths', relativePaths[index])
    }

    const winApi = process.env.WINDOWS_API_URL || 'http://127.0.0.1:5000'
    let uploadResponse
    try {
      uploadResponse = await axios.post(`${winApi}/upload`, backendForm, {
        headers: backendForm.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 120000,
      })
    } catch (error) {
      return NextResponse.json(
        { error: getBackendMessage(error, '上传到 Windows 转换服务失败') },
        { status: 502 },
      )
    }

    const taskId = uploadResponse.data?.task_id
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ error: 'Windows 转换服务未返回任务编号' }, { status: 502 })
    }

    try {
      await axios.post(`${winApi}/convert-folders/${taskId}`, {}, { timeout: 30000 })
    } catch (error) {
      return NextResponse.json(
        { error: getBackendMessage(error, '启动 Word 转 PDF 任务失败') },
        { status: 502 },
      )
    }

    const requestedZipName = typeof zipNameEntry === 'string' && zipNameEntry.trim()
      ? zipNameEntry.trim()
      : '转换后的PDF.zip'
    const zipName = requestedZipName.toLowerCase().endsWith('.zip')
      ? requestedZipName
      : `${requestedZipName}.zip`

    return NextResponse.json({
      status: 'accepted',
      taskId,
      fileCount: files.length,
      progressUrl: `/api/progress/${taskId}`,
      downloadUrl: `/api/download/${taskId}/converted?filename=${encodeURIComponent(zipName)}`,
      zipName,
    }, { status: 202 })
  } catch (error) {
    console.error('[Word 转 PDF] 创建任务失败:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建转换任务失败' },
      { status: 500 },
    )
  }
}
