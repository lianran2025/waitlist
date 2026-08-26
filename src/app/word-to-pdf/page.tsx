'use client'

import Link from 'next/link'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArchiveBoxArrowDownIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FolderOpenIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

type Phase = 'idle' | 'uploading' | 'processing' | 'completed' | 'error'

type SelectedDocx = {
  file: File
  pathWithinFolder: string
}

type SelectedFolder = {
  id: string
  sourceName: string
  outputName: string
  files: SelectedDocx[]
}

type ConversionResult = {
  file: string
  pdf?: string
  status: 'success' | 'fail'
  reason?: string
}

type ProgressPayload = {
  progress: number
  message: string
  status: 'processing' | 'completed' | 'failed'
  raw?: {
    results?: ConversionResult[]
    success_count?: number
    failure_count?: number
    source_cleanup_done?: boolean
    pdf_cleanup_done?: boolean
    cleanup_error?: string
    error?: string
  }
}

const directoryInputProps = {
  webkitdirectory: '',
  directory: '',
} as React.InputHTMLAttributes<HTMLInputElement> & {
  webkitdirectory: string
  directory: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function nextAvailableFolderName(name: string, usedNames: Set<string>) {
  if (!usedNames.has(name.toLocaleLowerCase('zh-CN'))) {
    return name
  }

  let suffix = 2
  while (usedNames.has(`${name} (${suffix})`.toLocaleLowerCase('zh-CN'))) {
    suffix += 1
  }
  return `${name} (${suffix})`
}

async function readResponseError(response: Response, fallback: string) {
  const data = await response.json().catch(() => null)
  return data?.error || data?.message || fallback
}

export default function WordToPdfPage() {
  const [folders, setFolders] = useState<SelectedFolder[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [zipName, setZipName] = useState('转换后的PDF.zip')
  const [results, setResults] = useState<ConversionResult[]>([])
  const [successCount, setSuccessCount] = useState(0)
  const [failureCount, setFailureCount] = useState(0)
  const [cleanupDone, setCleanupDone] = useState(false)
  const [cleanupError, setCleanupError] = useState('')
  const pollingGeneration = useRef(0)

  const totalFiles = useMemo(
    () => folders.reduce((sum, folder) => sum + folder.files.length, 0),
    [folders],
  )
  const totalBytes = useMemo(
    () => folders.reduce(
      (sum, folder) => sum + folder.files.reduce((folderSum, item) => folderSum + item.file.size, 0),
      0,
    ),
    [folders],
  )
  const isBusy = phase === 'uploading' || phase === 'processing'

  useEffect(() => () => {
    pollingGeneration.current += 1
  }, [])

  const handleFolderSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const pickedFiles = Array.from(event.target.files || [])
    event.target.value = ''

    const groupedFiles = new Map<string, SelectedDocx[]>()
    for (const file of pickedFiles) {
      if (!file.name.toLowerCase().endsWith('.docx') || file.name.startsWith('~$')) {
        continue
      }

      const relativePath = file.webkitRelativePath || file.name
      const pathParts = relativePath.split('/').filter(Boolean)
      const rootName = pathParts.length > 1 ? pathParts[0] : '已选文件夹'
      const pathWithinFolder = pathParts.length > 1
        ? pathParts.slice(1).join('/')
        : file.name
      const group = groupedFiles.get(rootName) || []
      group.push({ file, pathWithinFolder })
      groupedFiles.set(rootName, group)
    }

    if (groupedFiles.size === 0) {
      setError('所选文件夹中没有找到可转换的 DOCX 文件。Word 临时文件（~$ 开头）会被自动忽略。')
      return
    }

    setError('')
    setFolders(previous => {
      const usedNames = new Set(previous.map(folder => folder.outputName.toLocaleLowerCase('zh-CN')))
      const additions = Array.from(groupedFiles.entries()).map(([sourceName, files]) => {
        const outputName = nextAvailableFolderName(sourceName, usedNames)
        usedNames.add(outputName.toLocaleLowerCase('zh-CN'))
        return {
          id: createId(),
          sourceName,
          outputName,
          files: files.sort((a, b) => a.pathWithinFolder.localeCompare(b.pathWithinFolder, 'zh-CN')),
        }
      })
      return [...previous, ...additions]
    })
  }

  const removeFolder = (folderId: string) => {
    setFolders(previous => previous.filter(folder => folder.id !== folderId))
  }

  const resetTask = () => {
    pollingGeneration.current += 1
    setFolders([])
    setPhase('idle')
    setProgress(0)
    setMessage('')
    setError('')
    setDownloadUrl('')
    setResults([])
    setSuccessCount(0)
    setFailureCount(0)
    setCleanupDone(false)
    setCleanupError('')
  }

  const pollTask = async (taskId: string, generation: number) => {
    while (pollingGeneration.current === generation) {
      try {
        const response = await fetch(`/api/progress/${taskId}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(await readResponseError(response, '获取转换进度失败'))
        }

        const data = await response.json() as ProgressPayload
        setProgress(data.progress || 0)
        setMessage(data.message || '正在处理...')
        setResults(data.raw?.results || [])
        setSuccessCount(data.raw?.success_count || 0)
        setFailureCount(data.raw?.failure_count || 0)
        setCleanupDone(data.raw?.source_cleanup_done === true && data.raw?.pdf_cleanup_done === true)
        setCleanupError(data.raw?.cleanup_error || '')

        if (data.status === 'completed') {
          setPhase('completed')
          return
        }
        if (data.status === 'failed') {
          setPhase('error')
          setError(data.raw?.error || data.message || '转换失败')
          return
        }
      } catch (pollError) {
        setPhase('error')
        setError(pollError instanceof Error ? pollError.message : '获取转换进度失败')
        return
      }

      await new Promise(resolve => window.setTimeout(resolve, 1500))
    }
  }

  const startConversion = async () => {
    if (totalFiles === 0 || isBusy) return
    if (totalFiles > 200) {
      setError('一次最多转换 200 个 DOCX 文件，请分批处理。')
      return
    }
    if (totalBytes > 500 * 1024 * 1024) {
      setError('本次 DOCX 文件总大小超过 500 MB，请分批处理。')
      return
    }

    const outputZipName = folders.length === 1
      ? `${folders[0].outputName}-PDF.zip`
      : '批量文件夹-PDF.zip'
    setZipName(outputZipName)
    setPhase('uploading')
    setProgress(5)
    setMessage('正在上传 DOCX 文件...')
    setError('')
    setDownloadUrl('')
    setResults([])
    setSuccessCount(0)
    setFailureCount(0)
    setCleanupDone(false)
    setCleanupError('')

    const formData = new FormData()
    for (const folder of folders) {
      for (const item of folder.files) {
        formData.append('files', item.file, item.file.name)
        formData.append('relative_paths', `${folder.outputName}/${item.pathWithinFolder}`)
      }
    }
    formData.append('zip_name', outputZipName)

    try {
      const response = await fetch('/api/word-to-pdf', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        throw new Error(await readResponseError(response, '创建转换任务失败'))
      }

      const data = await response.json()
      if (!data.taskId || !data.downloadUrl) {
        throw new Error('转换服务返回的信息不完整')
      }

      setDownloadUrl(data.downloadUrl)
      setPhase('processing')
      setProgress(10)
      setMessage('文件已上传，正在等待 Word 转换...')
      const generation = pollingGeneration.current + 1
      pollingGeneration.current = generation
      void pollTask(data.taskId, generation)
    } catch (startError) {
      setPhase('error')
      setProgress(0)
      setError(startError instanceof Error ? startError.message : '创建转换任务失败')
    }
  }

  const failedResults = results.filter(result => result.status === 'fail')

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/"
              className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              返回证书制作
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              批量文件夹 Word 转 PDF
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              一次添加多个本地文件夹，系统会转换其中所有 DOCX，保留原目录层级并打包成一个 ZIP。
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            <ShieldCheckIcon className="h-5 w-5" />
            不修改电脑原文件
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <FolderOpenIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">选择本地文件夹</h2>
                  <p className="mt-0.5 text-sm text-slate-500">可以一次多选，也可以分多次继续添加</p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <input
                {...directoryInputProps}
                id="word-folder-picker"
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
                disabled={isBusy}
                onChange={handleFolderSelection}
                className="sr-only"
              />
              <label
                htmlFor="word-folder-picker"
                className={`flex min-h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
                  isBusy
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                    : 'cursor-pointer border-blue-200 bg-blue-50/60 text-blue-900 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <FolderOpenIcon className="h-10 w-10" />
                <span className="mt-3 text-base font-semibold">选择一个或多个文件夹</span>
                <span className="mt-1 text-sm opacity-75">只会读取并上传 DOCX，其他文件自动忽略</span>
              </label>

              {folders.length > 0 && (
                <div className="mt-6 space-y-3">
                  {folders.map(folder => (
                    <div key={folder.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm">
                        <FolderOpenIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{folder.outputName}</p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {folder.files.length} 个 DOCX
                          {folder.outputName !== folder.sourceName && ' · 同名文件夹已自动编号'}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => removeFolder(folder.id)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`移除文件夹 ${folder.outputName}`}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                  <ExclamationTriangleIcon className="h-5 w-5 flex-none" />
                  <p className="break-words">{error}</p>
                </div>
              )}

              {(phase === 'uploading' || phase === 'processing' || phase === 'completed') && (
                <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="flex items-center justify-between gap-4 text-sm font-medium text-blue-950">
                    <span className="truncate">{message}</span>
                    <span className="flex-none">{progress}%</span>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-[width] duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {phase === 'completed' && downloadUrl && (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="h-7 w-7 flex-none text-emerald-700" />
                    <div>
                      <h3 className="font-semibold text-emerald-950">PDF 压缩包已准备好</h3>
                      <p className="mt-1 text-sm text-emerald-800">
                        {successCount} 个转换成功{failureCount > 0 ? `，${failureCount} 个失败` : ''}。
                        {cleanupDone
                          ? '服务器上的 DOCX 上传副本已在打包后清理。'
                          : 'ZIP 已生成，但服务器临时文件清理失败，请联系管理员。'}
                      </p>
                      {cleanupError && <p className="mt-1 text-xs text-amber-800">清理错误：{cleanupError}</p>}
                    </div>
                  </div>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <a
                      href={downloadUrl}
                      download={zipName}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                    >
                      <ArchiveBoxArrowDownIcon className="h-5 w-5" />
                      下载 {zipName}
                    </a>
                    <button
                      type="button"
                      onClick={resetTask}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-5 py-3 font-semibold text-emerald-800 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                    >
                      <ArrowPathIcon className="h-5 w-5" />
                      开始新任务
                    </button>
                  </div>
                </div>
              )}

              {failedResults.length > 0 && (
                <details className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <summary className="cursor-pointer font-medium text-amber-950">
                    查看 {failedResults.length} 个失败文件
                  </summary>
                  <ul className="mt-3 space-y-2 text-sm text-amber-900">
                    {failedResults.map(result => (
                      <li key={result.file} className="break-words">
                        <span className="font-medium">{result.file}</span>
                        {result.reason && <span className="block text-amber-700">{result.reason}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">本次任务</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">文件夹</dt>
                  <dd className="font-semibold text-slate-900">{folders.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">DOCX 文件</dt>
                  <dd className="font-semibold text-slate-900">{totalFiles}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">上传大小</dt>
                  <dd className="font-semibold text-slate-900">{formatBytes(totalBytes)}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={startConversion}
                disabled={totalFiles === 0 || isBusy || phase === 'completed'}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isBusy ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <DocumentTextIcon className="h-5 w-5" />}
                {phase === 'uploading' ? '正在上传...' : phase === 'processing' ? '正在转换...' : '开始转换并打包'}
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                单次最多 200 个文件，总大小不超过 500 MB
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">处理规则</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>保留所选文件夹及子目录结构。</li>
                <li>ZIP 中只包含转换成功的 PDF。</li>
                <li>同名文件夹会自动添加序号，避免覆盖。</li>
                <li>服务器临时 DOCX 在 ZIP 生成后删除。</li>
                <li>电脑中的原始 DOCX 不会被删除或修改。</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
