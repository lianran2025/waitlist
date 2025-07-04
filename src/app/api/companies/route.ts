import { NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma'
import { companiesJson } from '@/lib/companies-json'

export async function GET() {
  try {
    const companies = companiesJson.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(companies)
  } catch (error) {
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
    const { shortName, fullName, products, alarm } = body

    const company = companiesJson.create({
      data: {
        shortName,
        fullName,
        products,
        alarm
      }
    })

    return NextResponse.json(company)
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json(
      { error: '创建公司失败' },
      { status: 500 }
    )
  }
} 