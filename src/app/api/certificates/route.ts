import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { promises as fs } from 'fs'
import path from 'path'

// 证书存储的文件夹名称
const CERTIFICATES_FOLDER = 'certificates'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: '未找到文件' },
        { status: 400 }
      )
    }

    // 生成唯一的文件名
    const timestamp = new Date().getTime()
    const fileName = `${timestamp}-${file.name}`
    const filePath = `${CERTIFICATES_FOLDER}/${fileName}`

    // 将文件转换为 Buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // 上传到 Vercel Blob Storage
    const blob = await put(filePath, buffer, {
      access: 'public',
      addRandomSuffix: false,
    })

    return NextResponse.json({
      status: 'success',
      url: blob.url,
      pathname: blob.pathname,
    })

  } catch (error) {
    console.error('存储证书文件时出错:', error)
    return NextResponse.json(
      { error: '存储证书文件失败' },
      { status: 500 }
    )
  }
}

// 获取证书文件列表
export async function GET() {
  try {
    // 这里可以添加获取证书列表的逻辑
    // 需要实现 Vercel Blob Storage 的列表功能
    return NextResponse.json({
      status: 'success',
      message: '获取证书列表功能待实现'
    })
  } catch (error) {
    console.error('获取证书列表时出错:', error)
    return NextResponse.json(
      { error: '获取证书列表失败' },
      { status: 500 }
    )
  }
} 