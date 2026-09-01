import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createClient } from '@supabase/supabase-js';

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

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dakar', req.url));
  }

  const edition = extractEditionFromPath(pathname);
  if (edition && requiresAccess(pathname)) {
    if (!req.auth) {
      const signInUrl = new URL('/connexion', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const email = req.auth.user?.email;
    if (!email) {
      return NextResponse.redirect(new URL('/connexion', req.url));
    }

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
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
