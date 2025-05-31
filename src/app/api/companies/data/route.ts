import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 将数据转换为与示例代码相同的格式
    const formattedCompanies = companies.map((company: any) => ({
      name: company.shortName,
      fullname: company.fullName,
      list: company.products,
      alarm: company.alarm
    }))

    const response = NextResponse.json(formattedCompanies)
    
    // 添加缓存控制头
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')

    return response
  } catch (error) {
    console.error('Error fetching companies:', error)
    // 返回空数组，保证前端安全
    return NextResponse.json([])
  }
} 