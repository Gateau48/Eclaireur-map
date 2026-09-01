import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabase } from '@/lib/db/client';

const EDITION_SLUGS = ['dakar'];

function extractEditionFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 1 && EDITION_SLUGS.includes(segments[0])) {
    return segments[0];
  }
  return null;
}

function requiresAccess(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 2) return false;
  if (segments[1] === 'vente') return false;
  if (segments[1] === 'activate') return false;
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dakar', req.url));
  }

  const edition = extractEditionFromPath(pathname);
  if (edition && requiresAccess(pathname)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const signInUrl = new URL('/connexion', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    const email = token.email;
    if (!email) {
      return NextResponse.redirect(new URL('/connexion', req.url));
    }

    try {
      const { data } = await supabase
        .from('purchases')
        .select('id')
        .eq('email', email)
        .eq('edition_id', edition)
        .eq('status', 'active')
        .maybeSingle();

      if (!data) {
        return NextResponse.redirect(new URL(`/${edition}/vente`, req.url));
      }
    } catch {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
