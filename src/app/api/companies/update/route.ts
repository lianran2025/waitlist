import { NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma'
import { companiesJson } from '@/lib/companies-json'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, fullname, list, alarm } = body

    // 查找是否存在相同全名的公司
    const existingCompany = companiesJson.findFirst({
      where: {
        fullName: fullname
      }
    })

    if (existingCompany) {
      // 如果公司存在，更新产品列表
      const updatedCompany = companiesJson.update({
        where: {
          id: existingCompany.id
        },
        data: {
          products: list
        }
      })

      const response = NextResponse.json({
        name: updatedCompany.shortName,
        fullname: updatedCompany.fullName,
        list: updatedCompany.products,
        alarm: updatedCompany.alarm
      })

      // 添加缓存控制头
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      response.headers.set('Surrogate-Control', 'no-store')

      return response
    } else {
      // 如果公司不存在，创建新公司
      const newCompany = companiesJson.create({
        data: {
          shortName: name,
          fullName: fullname,
          products: list,
          alarm: alarm || 0
        }
      })

      const response = NextResponse.json({
        name: newCompany.shortName,
        fullname: newCompany.fullName,
        list: newCompany.products,
        alarm: newCompany.alarm
      })

      // 添加缓存控制头
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      response.headers.set('Surrogate-Control', 'no-store')

      return response
    }
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { error: '更新公司信息失败' },
      { status: 500 }
    )
  }
} 