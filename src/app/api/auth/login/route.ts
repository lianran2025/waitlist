import { NextRequest, NextResponse } from 'next/server';
import { getSession, verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, message: '请输入密码' },
        { status: 400 }
      );
    }

    const isValid = await verifyPassword(password);

    if (isValid) {
      const session = await getSession();
      session.isAuthenticated = true;
      session.loginTime = Date.now();
      await session.save();

      return NextResponse.json({ success: true, message: '登录成功' });
    } else {
      return NextResponse.json(
        { success: false, message: '密码错误' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
} 