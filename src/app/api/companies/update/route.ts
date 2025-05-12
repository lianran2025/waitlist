import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, fullname, list, alarm } = body

    // 查找是否存在相同全名的公司
    const existingCompany = await prisma.company.findFirst({
      where: {
        fullName: fullname
      }
    })

    if (existingCompany) {
      // 如果公司存在，更新产品列表
      const updatedCompany = await prisma.company.update({
        where: {
          id: existingCompany.id
        },
        data: {
          products: list
        }
      })

      return NextResponse.json({
        name: updatedCompany.shortName,
        fullname: updatedCompany.fullName,
        list: updatedCompany.products,
        alarm: updatedCompany.alarm
      })
    } else {
      // 如果公司不存在，创建新公司
      const newCompany = await prisma.company.create({
        data: {
          shortName: name,
          fullName: fullname,
          products: list,
          alarm: alarm || 0
        }
      })

      return NextResponse.json({
        name: newCompany.shortName,
        fullname: newCompany.fullName,
        list: newCompany.products,
        alarm: newCompany.alarm
      })
    }
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { error: '更新公司信息失败' },
      { status: 500 }
    )
  }
} 