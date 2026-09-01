import { createHmac, timingSafeEqual } from "crypto";

/**
 * Vérifie la signature HMAC-SHA256 d'un Pulse Chariow, selon le contrat
 * documenté ici : https://chariow.dev/en/guides/pulse-security
 *
 *   signature = "sha256=" + hex( hmac_sha256(raw_request_body, pulse_secret) )
 *
 * GARDE-FOU : `rawBody` doit être les octets bruts EXACTS reçus, avant tout
 * JSON.parse — ne jamais re-sérialiser le payload parsé pour vérifier,
 * les barres obliques échappées et les \uXXXX suffisent à casser le digest.
 * `pulse_secret` est le secret de signature du Pulse (préfixe `whsec_`),
 * distinct de la clé API — voir CHARIOW_PULSE_SECRET dans .env.example.
 */
export function verifyPulseSignature(
  rawBody: string,
  signatureHeader: string | null,
  pulseSecret: string | undefined
): boolean {
  if (!signatureHeader || !pulseSecret) return false;
  if (!signatureHeader.startsWith("sha256=")) return false;

  const expected =
    "sha256=" + createHmac("sha256", pulseSecret).update(rawBody, "utf8").digest("hex");

  const receivedBuf = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);

  // GARDE-FOU : vérifier la longueur avant timingSafeEqual, qui lève une
  // exception (plutôt que de renvoyer false) sur des buffers de tailles
  // différentes.
  if (receivedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(receivedBuf, expectedBuf);
}
