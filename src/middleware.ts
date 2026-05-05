import { getIronSession } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';
import type { SessionData } from '@/lib/auth';
import { sessionOptions } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 允许访问登录页面和认证API
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  try {
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    if (session.isAuthenticated === true) {
      return response;
    }
  } catch (error) {
    console.error('Session verification error:', error);
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: '未登录或登录已过期' },
      { status: 401 }
    );
  }

  {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)  
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 
