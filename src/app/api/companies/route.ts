import { NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma'
import { CompanyValidationError } from '@/lib/product-config'
import { companiesJson } from '@/lib/companies-json'

// 公司信息由 JSON 实时维护，生产构建不可将列表静态缓存。
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const companies = companiesJson.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(companies)
  } catch (error) {
    if (error instanceof CompanyValidationError) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('Error fetching companies:', error)
    return NextResponse.json(
      { error: '获取公司列表失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { shortName, fullName, products, alarm, range, rangeConfirmed, productConfigs } = body

    const company = companiesJson.create({
      data: {
        shortName,
        fullName,
        products,
        productConfigs,
        alarm,
        range,
        rangeConfirmed
      }
    })

    return NextResponse.json(company)
  } catch (error) {
    if (error instanceof CompanyValidationError) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('Error creating company:', error)
    return NextResponse.json(
      { error: '创建公司失败' },
      { status: 500 }
    )
  }
} 
