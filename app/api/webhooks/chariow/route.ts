import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySignature } from "@/lib/license/verifySignature";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-chariow-signature");
  const rawBody = await req.text();

  // GARDE-FOU 1 : vérifier la signature AVANT de parser/faire confiance au contenu.
  if (!verifySignature(rawBody, signature, process.env.CHARIOW_WEBHOOK_SECRET)) {
    return NextResponse.json("Invalid signature", { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json("Invalid JSON", { status: 400 });
  }

  // Client Supabase initialisé à l'intérieur du handler (pas au module level)
  // pour éviter l'erreur "supabaseUrl is required" au build time.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  if (event.type === "sale.completed") {
    // GARDE-FOU 2 : idempotence — un webhook peut être envoyé plusieurs fois
    // (retry réseau) ; upsert sur chariow_sale_id (contrainte unique SQL).
    const { error } = await supabase.from("purchases").upsert(
      {
        email: event.data.customer.email,
        edition_id: event.data.custom_metadata.edition_id,
        chariow_sale_id: event.data.sale.id,
        status: "active"
      },
      { onConflict: "chariow_sale_id" }
    );
    if (error) {
      console.error("Échec upsert purchase:", error);
      return NextResponse.json("DB error", { status: 500 });
    }
  }

  if (event.type === "sale.refunded") {
    const { error } = await supabase
      .from("purchases")
      .update({ status: "refunded" })
      .eq("chariow_sale_id", event.data.sale.id);
    if (error) {
      console.error("Échec update refund:", error);
      return NextResponse.json("DB error", { status: 500 });
    }
  }

  // GARDE-FOU 3 : toujours répondre 200 rapidement, sinon Chariow réessaiera indéfiniment.
  return NextResponse.json("OK", { status: 200 });
}
