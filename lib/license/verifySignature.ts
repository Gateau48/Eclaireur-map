import { createHmac, timingSafeEqual } from "crypto";

/**
 * Vérifie la signature HMAC-SHA256 d'un webhook Chariow.
 *
 * GARDE-FOU : la vérification doit se faire sur le corps BRUT de la requête
 * (rawBody), avant tout JSON.parse — voir app/api/webhooks/chariow/route.ts.
 *
 * Note : le format exact de signature de Chariow (algorithme, encodage,
 * éventuel préfixe "sha256=") est à confirmer dans leur documentation
 * développeur au moment de l'intégration ; cette implémentation suit le
 * schéma HMAC standard le plus courant et doit être ajustée si Chariow
 * documente un format différent.
 */
export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined
): boolean {
  if (!signatureHeader || !secret) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.replace(/^sha256=/, "");

  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(provided, "hex");

  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}
