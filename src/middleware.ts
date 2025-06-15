import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('🚀 MIDDLEWARE TRIGGERED for:', request.nextUrl.pathname);
  
  const pathname = request.nextUrl.pathname;
  
  // 允许访问登录页面和认证API
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    console.log('✅ Allowing public path:', pathname);
    return NextResponse.next();
  }

  // 简单检查：如果没有 session cookie，重定向到登录页
  const sessionCookie = request.cookies.get('auth-session');
  
  if (!sessionCookie) {
    console.log('🚫 No session cookie, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  console.log('✅ Has session cookie, allowing access');
  return NextResponse.next();
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