import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      company_name,
      all_nums,
      date,
      temperature,
      humidity,
      sections,
      sections_num,
      start_num 
    } = body

    // 验证数据
    if (!company_name || !all_nums || !date || !temperature || !humidity || !sections || !sections_num || !start_num) {
      return NextResponse.json(
        { error: '所有字段都是必填的' },
        { status: 400 }
      )
    }

    // 处理数据
    const sections_list = sections.trim().split(' ')
    const sections_num_list = sections_num.trim().split(' ').map(Number)
    const formatted_date = date.replace("-", "")

    // 验证数据完整性
    if (sections_list.length !== sections_num_list.length) {
      return NextResponse.json(
        { error: '区域数量与探头数量不匹配' },
        { status: 400 }
      )
    }

    const total_probes = sections_num_list.reduce((a: number, b: number) => a + b, 0)
    if (total_probes !== all_nums) {
      return NextResponse.json(
        { error: '探头总数与各区域数量之和不匹配' },
        { status: 400 }
      )
    }

    // 生成证书数据
    const certificates = []
    for (let i = 0; i < all_nums; i++) {
      const section = sections_list[Math.floor(i / sections_num_list[0])]
      const alert_num = `${section}_${String(i + 1).padStart(3, '0')}`
      const file_num = `ZJYX-${formatted_date}0${String(i + start_num).padStart(3, '0')}`

      certificates.push({
        file_num,
        company_name,
        alert_type: 'AEC2332',
        alert_factory: '成都安可信电子股份有限公司',
        dongzuozhi: 'ankexindongzuo',
        alert_num,
        date_now: new Date(date).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).replace(/\//g, ' 年 ').replace(/\//g, ' 月 ') + ' 日',
        date_next: new Date(new Date(date).setFullYear(new Date(date).getFullYear() + 1))
          .toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/\//g, ' 年 ').replace(/\//g, ' 月 ') + ' 日',
        temperature,
        humidity,
        random_chongfu: (Math.random() * 1.5 + 0.5).toFixed(1),
        action_time: Math.floor(Math.random() * 18) + 7
      })
    }

    return NextResponse.json({
      status: 'success',
      message: '证书数据生成成功',
      data: certificates
    })

  } catch (error) {
    console.error('生成证书时出错:', error)
    return NextResponse.json(
      { error: '生成证书失败' },
      { status: 500 }
    )
  }
} 