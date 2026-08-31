import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies, verifySessionJWT, createSessionJWT, setSessionCookie, needsRenewal } from '@/lib/license/session';
import { isValidEdition, EDITIONS } from '@/lib/data/types';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root path - redirect to default edition
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dakar', request.url));
  }

  // Extract edition from path
  const pathParts = pathname.split('/').filter(Boolean);
  const editionSlug = pathParts[0];

  // Only process edition routes
  if (!editionSlug || !isValidEdition(editionSlug)) {
    return NextResponse.next();
  }

  const cookieHeader = request.headers.get('cookie') || '';

  // Handle /activate route
  if (pathParts[1] === 'activate') {
    // Check if already has valid session - redirect to edition page
    const sessionToken = getSessionFromCookies(cookieHeader, editionSlug);
    if (sessionToken) {
      const payload = await verifySessionJWT(sessionToken);
      if (payload && payload.edition === editionSlug) {
        return NextResponse.redirect(new URL(`/${editionSlug}`, request.url));
      }
    }
    // Allow access to activate page
    return NextResponse.next();
  }

  // Handle edition root page - requires valid session
  if (pathParts.length === 1 || (pathParts.length === 2 && pathParts[1] === '')) {
    const sessionToken = getSessionFromCookies(cookieHeader, editionSlug);

    if (!sessionToken) {
      // No session - redirect to activate
      return NextResponse.redirect(new URL(`/${editionSlug}/activate`, request.url));
    }

    const payload = await verifySessionJWT(sessionToken);

    if (!payload || payload.edition !== editionSlug) {
      // Invalid session - redirect to activate
      return NextResponse.redirect(new URL(`/${editionSlug}/activate`, request.url));
    }

    // Check if session needs renewal
    if (needsRenewal(payload)) {
      // Renew the JWT
      const newToken = await createSessionJWT(editionSlug, payload.licenseKey);
      const response = NextResponse.next();
      const sessionCookie = setSessionCookie(editionSlug, newToken);
      response.headers.append('Set-Cookie', sessionCookie);
      return response;
    }

    // Valid session - allow access
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
