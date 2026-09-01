import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createClient } from "@supabase/supabase-js";

// Client Supabase compatible fetch (Edge Runtime), pas un driver Postgres direct.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const RESERVED_SEGMENTS = new Set([
  "connexion",
  "tableau-de-bord",
  "api",
  "_next",
  "favicon.ico"
]);

/** Extrait le slug d'édition depuis un chemin de type /dakar ou /dakar/vente. */
function extractEditionFromPath(pathname: string): string | null {
  const [, first] = pathname.split("/");
  if (!first || RESERVED_SEGMENTS.has(first)) return null;
  return first;
}

/**
 * GARDE-FOU : exclure explicitement /[edition]/vente de la protection —
 * c'est la route publique. Seule /[edition] (la carte) est protégée.
 */
function requiresAccess(pathname: string): boolean {
  const edition = extractEditionFromPath(pathname);
  if (!edition) return false;
  const rest = pathname.split("/").slice(2).join("/");
  return rest === ""; // /[edition] exactement, pas /[edition]/vente
}

export async function middleware(req: NextRequest) {
  const edition = extractEditionFromPath(req.nextUrl.pathname);

  if (edition && requiresAccess(req.nextUrl.pathname)) {
    const token = await getToken({ req });
    if (!token?.email) {
      const signInUrl = new URL("/connexion", req.url);
      signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }

    const { data } = await supabase
      .from("purchases")
      .select("id")
      .eq("email", token.email as string)
      .eq("edition_id", edition)
      .eq("status", "active")
      .maybeSingle();

    if (!data) {
      return NextResponse.redirect(new URL(`/${edition}/vente`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
