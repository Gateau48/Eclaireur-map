import { NextRequest } from "next/server";
import { supabase } from "@/lib/db/client";
import { verifyPulseSignature } from "@/lib/license/verifySignature";

/**
 * Endpoint de réception des Pulses Chariow.
 * Référence : https://chariow.dev/en/guides/pulses
 *             https://chariow.dev/en/guides/pulse-security
 *
 * À déclarer dans le dashboard Chariow (Automations → Pulses) avec :
 *   URL     : https://<votre-domaine>/api/webhooks/chariow
 *   Événements : au minimum "Successful Sale" (successful.sale)
 */
export async function POST(req: NextRequest) {
  // GARDE-FOU : capturer le corps BRUT avant tout parsing — la signature
  // est calculée sur les octets exacts reçus, jamais sur une version
  // re-sérialisée.
  const rawBody = await req.text();
  const signature = req.headers.get("x-chariow-signature");
  const deliveryId = req.headers.get("x-pulse-delivery-id"); // absent sur un test event
  const eventHeader = req.headers.get("x-pulse-event");

  if (!verifyPulseSignature(rawBody, signature, process.env.CHARIOW_PULSE_SECRET)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event: string = payload.event ?? eventHeader;

  // GARDE-FOU (dédoublonnage) : Chariow retente une livraison jusqu'à 5 fois
  // sur erreur/timeout ; x-pulse-delivery-id est l'identifiant stable à
  // dédupliquer, PAS l'id de la vente (une même vente peut légitimement
  // produire plusieurs livraisons). Les test events du dashboard n'ont pas
  // de delivery id — on les traite sans les persister.
  if (deliveryId) {
    const { data: existing } = await supabase
      .from("pulse_deliveries")
      .select("id")
      .eq("id", deliveryId)
      .maybeSingle();
    if (existing) {
      return new Response("OK", { status: 200 });
    }
  }

  switch (event) {
    case "successful.sale": {
      const editionId = payload.sale?.custom_metadata?.edition_id;
      const saleId = payload.sale?.id;
      const email = payload.customer?.email;

      if (!editionId || !saleId || !email) {
        console.error("Pulse successful.sale incomplet:", payload);
        break;
      }

      // GARDE-FOU (idempotence métier) : upsert sur chariow_sale_id, en plus
      // du dédoublonnage par delivery id ci-dessus — double filet de
      // sécurité si jamais deux Pulses différents référencent la même vente.
      const { error } = await supabase.from("purchases").upsert(
        {
          email,
          edition_id: editionId,
          chariow_sale_id: saleId,
          status: "active"
        },
        { onConflict: "chariow_sale_id" }
      );
      if (error) {
        console.error("Échec upsert purchase:", error);
        return new Response("DB error", { status: 500 });
      }
      break;
    }

    case "abandoned.sale":
    case "failed.sale":
      // Rien à faire côté accès : aucun accès n'a été accordé pour ces
      // ventes. Utile si vous voulez plus tard relancer le client par
      // e-mail (non implémenté ici).
      break;

    default:
      // Note : au moment de l'écriture de ce code, la documentation Chariow
      // ne liste pas d'événement Pulse dédié au remboursement (uniquement
      // successful.sale / abandoned.sale / failed.sale pour les ventes).
      // Si Chariow ajoute un tel événement, le gérer ici en repassant la
      // ligne `purchases` correspondante à status: 'refunded'.
      console.log(`Événement Pulse non géré : ${event}`);
  }

  if (deliveryId) {
    await supabase.from("pulse_deliveries").insert({ id: deliveryId });
  }

  // GARDE-FOU : toujours répondre 2xx rapidement, sinon Chariow retente
  // (jusqu'à 5 fois, en ~3h) puis désactive le Pulse après 5 échecs.
  return new Response("OK", { status: 200 });
}
