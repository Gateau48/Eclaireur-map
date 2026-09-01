import { NextRequest, NextResponse } from "next/server";

const RESERVED_SEGMENTS = new Set([
  "connexion",
  "tableau-de-bord",
  "api",
  "_next",
  "favicon.ico"
]);

function extractEditionFromPath(pathname: string): string | null {
  const [, first] = pathname.split("/");
  if (!first || RESERVED_SEGMENTS.has(first)) return null;
  return first;
}

export async function middleware(req: NextRequest) {
  // Auth desactivee temporairement — la carte est accessible sans connexion.
  // Réactiver quand Google OAuth + Supabase seront configurés.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
