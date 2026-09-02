"use client";

import { useEffect, useState } from "react";
import type { ChariowAmount } from "./chariow";

/**
 * GARDE-FOU sur l'honnêteté produit : l'API Chariow (GET /v1/products/{id})
 * ne renvoie qu'UNE devise fixe, celle configurée par le marchand — pas de
 * paramètre de localisation par visiteur. La vraie conversion multi-devises
 * de Chariow se fait sur LEUR page de paiement (carte en EUR/USD, Mobile
 * Money en FCFA...), pas via cette API. On ne peut donc pas afficher "le"
 * prix dans la devise du visiteur avec certitude — seulement une
 * estimation, clairement présentée comme telle, pour aider à se projeter
 * avant le paiement (le montant exact est confirmé chez Chariow).
 */

const REGION_CURRENCY: Record<string, string> = {
  SN: "XOF", CI: "XOF", BJ: "XOF", TG: "XOF", ML: "XOF", BF: "XOF", NE: "XOF", GW: "XOF",
  FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", BE: "EUR", NL: "EUR", PT: "EUR", IE: "EUR", LU: "EUR", AT: "EUR",
  US: "USD", CA: "CAD", GB: "GBP", AU: "AUD", CH: "CHF",
  MA: "MAD", DZ: "DZD", TN: "TND", NG: "NGN", GH: "GHS"
};

function detectVisitorCurrency(): string | null {
  try {
    const region =
      new Intl.Locale(navigator.language).region ?? navigator.language.split("-")[1];
    return region ? REGION_CURRENCY[region.toUpperCase()] ?? null : null;
  } catch {
    return null;
  }
}

/** Renvoie une chaîne formatée du type "≈ 23 €", ou null si la devise du
 *  visiteur est inconnue, identique à celle du produit, ou si le taux de
 *  change n'a pas pu être récupéré (échec silencieux — le prix de base
 *  reste toujours affiché de toute façon). */
export function useApproxLocalPrice(price: ChariowAmount | null): string | null {
  const [approx, setApprox] = useState<string | null>(null);

  useEffect(() => {
    setApprox(null);
    if (!price) return;
    const targetCurrency = detectVisitorCurrency();
    if (!targetCurrency || targetCurrency === price.currency) return;

    let cancelled = false;
    fetch(`https://open.er-api.com/v6/latest/${price.currency}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const rate = data?.rates?.[targetCurrency];
        if (!rate) return;
        const converted = price.value * rate;
        const formatted = new Intl.NumberFormat(navigator.language, {
          style: "currency",
          currency: targetCurrency,
          maximumFractionDigits: converted >= 100 ? 0 : 2
        }).format(converted);
        setApprox(formatted);
      })
      .catch(() => {
        // Échec silencieux : l'estimation est un bonus, pas un blocant —
        // le prix de base (toujours exact) reste affiché dans tous les cas.
      });

    return () => {
      cancelled = true;
    };
  }, [price]);

  return approx;
}