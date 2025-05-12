import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name } = body

    if (!email) {
      return NextResponse.json(
        { error: '邮箱是必填项' },
        { status: 400 }
      )
    }

    const waitlist = await prisma.waitlist.create({
      data: {
        email,
        name: name || null
      }
    })

    return NextResponse.json(waitlist)
  } catch (error) {
    console.error('Error creating waitlist entry:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: '该邮箱已经注册' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
} 