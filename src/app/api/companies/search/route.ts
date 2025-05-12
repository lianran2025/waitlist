import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const term = searchParams.get('term')

    if (!term) {
      return NextResponse.json({ company: null })
    }

    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { shortName: { contains: term } },
          { fullName: { contains: term } },
        ],
      },
    })

    return NextResponse.json({ company })
  } catch (error) {
    return new NextResponse('服务器错误', { status: 500 })
  }
} 