import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createClient } from "@supabase/supabase-js";

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
    // Si les variables d'environnement ne sont pas configurées, laisser
    // passer sans vérification (mode développement / déploiement sans auth).
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GOOGLE_CLIENT_ID) {
      return NextResponse.next();
    }

    const token = await getToken({ req });
    if (!token?.email) {
      return NextResponse.redirect(new URL("/connexion", req.url));
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

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
