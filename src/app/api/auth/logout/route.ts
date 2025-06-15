import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();
    
    return NextResponse.json({ success: true, message: '已退出登录' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: '退出登录失败' },
      { status: 500 }
    );
  }
} 