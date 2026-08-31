import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root path - redirect to default edition
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dakar', request.url));
  }

  // All routes pass through (license check disabled for testing)
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
