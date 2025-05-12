import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { shortName, fullName, products, alarm } = body

    const updatedCompany = await prisma.company.update({
      where: { id: params.id },
      data: {
        shortName,
        fullName,
        products,
        alarm
      }
    })

    return NextResponse.json(updatedCompany)
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { error: '更新公司信息失败' },
      { status: 500 }
    )
  }
} 