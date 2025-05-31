'use client'

import { useState } from 'react'

export default function CertificateUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ url: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/certificates', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.status === 'success') {
        setUploadResult(data)
      } else {
        throw new Error(data.error || '上传失败')
      }
    } catch (error) {
      console.error('上传证书时出错:', error)
      alert('上传证书失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">上传证书</h2>
      <div className="space-y-4">
        <input
          type="file"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-4 py-2 bg-blue-500 text-white rounded-md
            disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {uploading ? '上传中...' : '上传证书'}
        </button>
        {uploadResult && (
          <div className="mt-4">
            <p className="text-green-600">上传成功！</p>
            <a
              href={uploadResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              查看证书
            </a>
          </div>
        )}
      </div>
    </div>
  )
} 