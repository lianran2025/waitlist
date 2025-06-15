import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    
    return NextResponse.json({
      success: true,
      isAuthenticated: session.isAuthenticated || false,
      loginTime: session.loginTime || null,
    });
  } catch (error) {
    console.error('Session status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '获取会话状态失败',
        isAuthenticated: false 
      },
      { status: 500 }
    );
  }
} 