import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// 模板文件路径
const TEMPLATES_DIR = path.join(process.cwd(), 'templates')

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const templateName = searchParams.get('name')

    if (!templateName) {
      return NextResponse.json(
        { error: '模板名称是必填的' },
        { status: 400 }
      )
    }

    // 验证文件名，防止目录遍历攻击
    if (!['model.docx', 'table_refer.docx'].includes(templateName)) {
      return NextResponse.json(
        { error: '无效的模板名称' },
        { status: 400 }
      )
    }

    const filePath = path.join(TEMPLATES_DIR, templateName)

    try {
      // 检查文件是否存在
      await fs.access(filePath)
    } catch (error) {
      return NextResponse.json(
        { error: '模板文件不存在' },
        { status: 404 }
      )
    }

    // 读取文件
    const fileBuffer = await fs.readFile(filePath)

    // 返回文件
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${templateName}"`
      }
    })

  } catch (error) {
    console.error('读取模板文件时出错:', error)
    return NextResponse.json(
      { error: '读取模板文件失败' },
      { status: 500 }
    )
  }
}

// 获取模板文件列表
export async function POST(request: Request) {
  try {
    // 读取模板目录
    const files = await fs.readdir(TEMPLATES_DIR)
    
    // 过滤出 .docx 文件
    const docxFiles = files.filter(file => file.endsWith('.docx'))
    
    return NextResponse.json({
      status: 'success',
      files: docxFiles
    })

  } catch (error) {
    console.error('获取模板文件列表时出错:', error)
    return NextResponse.json(
      { error: '获取模板文件列表失败' },
      { status: 500 }
    )
  }
} 