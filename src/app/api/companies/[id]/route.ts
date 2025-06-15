import { NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma'
import { companiesJson } from '@/lib/companies-json'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { shortName, fullName, products, alarm } = body

    const company = companiesJson.update({
      where: {
        id: params.id
      },
      data: {
        shortName,
        fullName,
        products,
        alarm
      }
    })

    return NextResponse.json(company)
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { error: '更新公司信息失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const company = companiesJson.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json(company)
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json(
      { error: '删除公司失败' },
      { status: 500 }
    )
  }
} 