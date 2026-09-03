import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getEditionConfig as getEdition } from "@/lib/editions-config";
import { getChariowProduct, initChariowCheckout } from "@/lib/chariow";
import { supabase } from "@/lib/db/client";

/**
 * GARDE-FOU : seul point d'entrée autorisé à appeler l'API Chariow avec la
 * clé secrète — jamais depuis le client. Exige une session Google active,
 * pour que l'email transmis à Chariow (et donc le webhook `successful.sale`
 * qui reviendra plus tard) corresponde exactement au compte que le
 * middleware vérifiera ensuite (Partie 6.3 du brief).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Connexion requise" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const editionId = body?.edition_id as string | undefined;
  const firstName = (body?.first_name as string | undefined)?.trim();
  const lastName = (body?.last_name as string | undefined)?.trim();
  const phoneNumber = (body?.phone_number as string | undefined)?.trim();
  const phoneCountryCode = (body?.phone_country_code as string | undefined)?.trim();

  if (!editionId || !firstName || !lastName || !phoneNumber || !phoneCountryCode) {
    return NextResponse.json({ message: "Champs manquants" }, { status: 422 });
  }

  const edition = getEdition(editionId);
  if (!edition) {
    return NextResponse.json({ message: "Édition inconnue" }, { status: 404 });
  }

  const origin = req.nextUrl.origin;

  const product = await getChariowProduct(edition.chariowProductId);
  if (product?.is_free) {
    const { error } = await supabase.from("purchases").upsert(
      {
        email: session.user.email,
        edition_id: editionId,
        chariow_sale_id: `free_${editionId}_${session.user.email}`,
        status: "active"
      },
      { onConflict: "chariow_sale_id" }
    );
    if (error) {
      console.error("Échec upsert purchase (gratuit):", error);
      return NextResponse.json({ message: "Erreur lors de l'activation de l'accès" }, { status: 500 });
    }
    return NextResponse.json({ step: "completed", redirectUrl: `${origin}/${editionId}` });
  }

  try {
    const result = await initChariowCheckout({
      productId: edition.chariowProductId,
      email: session.user.email,
      firstName,
      lastName,
      phoneNumber,
      phoneCountryCode,
      redirectUrl: `${origin}/${editionId}/paiement-reussi`,
      editionId,
      customerIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    });

    if (result.step === "already_purchased") {
      return NextResponse.json({ step: result.step, redirectUrl: `${origin}/${editionId}` });
    }

    if (result.step === "payment" && result.checkoutUrl) {
      return NextResponse.json({ step: result.step, redirectUrl: result.checkoutUrl });
    }

    return NextResponse.json({ step: result.step, redirectUrl: `${origin}/${editionId}/paiement-reussi` });
  } catch (err) {
    console.error("Échec initiation checkout Chariow:", err);
    return NextResponse.json({ message: "Le paiement n'a pas pu être initié" }, { status: 502 });
  }
}
