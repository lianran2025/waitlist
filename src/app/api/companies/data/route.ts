import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 将数据转换为与示例代码相同的格式
    const formattedCompanies = companies.map(company => ({
      name: company.shortName,
      fullname: company.fullName,
      list: company.products,
      alarm: company.alarm
    }))

    return NextResponse.json(formattedCompanies)
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json(
      { error: '获取公司列表失败' },
      { status: 500 }
    )
  }
} 