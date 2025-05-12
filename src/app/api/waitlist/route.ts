import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { waitlistSchema } from '@/lib/validations'

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const body = waitlistSchema.parse(json)

    const waitlist = await prisma.waitlist.create({
      data: {
        email: body.email,
        name: body.name,
      },
    })

    return NextResponse.json(waitlist)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return new NextResponse('该邮箱已经注册', { status: 400 })
    }
    return new NextResponse('服务器错误', { status: 500 })
  }
} 