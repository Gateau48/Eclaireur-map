import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { supabase } from "@/lib/db/client";

export async function GET(req: NextRequest, { params }: { params: { edition: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ active: false }, { status: 401 });
  }

  const { data } = await supabase
    .from("purchases")
    .select("id")
    .eq("email", session.user.email)
    .eq("edition_id", params.edition)
    .eq("status", "active")
    .maybeSingle();

  return NextResponse.json({ active: !!data });
}
