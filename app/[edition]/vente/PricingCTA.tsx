"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Lock, ShieldCheck, Timer } from "lucide-react";
// import type uniquement : évite d'entraîner "server-only" (lib/chariow.ts)
// dans le bundle client — ce composant ne reçoit que des données déjà
// sérialisées depuis la page serveur.
import type { ChariowAmount } from "@/lib/chariow";

interface PricingCTAProps {
  editionId: string;
  editionName: string;
  isAuthenticated: boolean;
  userName?: string | null;
  currentPrice: ChariowAmount | null;
  basePrice: ChariowAmount | null;
  priceOff: string | null;
  onSaleUntil: string | null;
}

const COUNTRY_CODES = [
  { code: "SN", label: "Sénégal (+221)" },
  { code: "CI", label: "Côte d'Ivoire (+225)" },
  { code: "FR", label: "France (+33)" },
  { code: "US", label: "États-Unis (+1)" }
];

function splitName(fullName?: string | null) {
  if (!fullName) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

export function PricingCTA({
  editionId,
  editionName,
  isAuthenticated,
  userName,
  currentPrice,
  basePrice,
  priceOff,
  onSaleUntil
}: PricingCTAProps) {
  const { firstName: defaultFirstName, lastName: defaultLastName } = splitName(userName);
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [countryCode, setCountryCode] = useState("SN");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/checkout/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edition_id: editionId,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          phone_country_code: countryCode
        })
      });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        setError(data.message ?? "Une erreur est survenue, réessayez.");
        setIsSubmitting(false);
        return;
      }
      // Redirection vers le checkout_url Chariow (paiement), ou directement
      // vers la carte si l'achat existait déjà.
      window.location.href = data.redirectUrl;
    } catch {
      setError("Une erreur est survenue, réessayez.");
      setIsSubmitting(false);
    }
  }

  return (
    <section id="debloquer" className="mx-auto max-w-6xl px-6 py-24">
      <div className="glass mx-auto max-w-md rounded-4xl p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Débloquer {editionName}</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Accès complet à la carte, mise à jour au fil des vérifications.
          </p>
        </div>

        <div className="mt-6 flex items-baseline justify-center gap-2">
          {currentPrice ? (
            <>
              <span className="text-4xl font-semibold tracking-tight">
                {currentPrice.formatted}
              </span>
              {basePrice && priceOff && (
                <span className="text-sm text-neutral-400 line-through">{basePrice.formatted}</span>
              )}
            </>
          ) : (
            <span className="text-sm text-neutral-400">Prix indisponible pour le moment</span>
          )}
        </div>

        {priceOff && (
          <p className="mt-1 text-center text-xs font-medium text-emerald-600">
            -{priceOff} pour le moment
          </p>
        )}

        {onSaleUntil && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <Timer className="h-3.5 w-3.5" aria-hidden />
            Offre valable jusqu&rsquo;au{" "}
            {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(
              new Date(onSaleUntil)
            )}
          </div>
        )}

        <div className="mt-6">
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={() =>
                signIn("google", { callbackUrl: `/${editionId}/vente#debloquer` })
              }
              className="flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <Lock className="h-4 w-4" aria-hidden />
              Se connecter avec Google pour continuer
            </button>
          ) : (
            <form onSubmit={handlePay} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom"
                  className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm outline-none focus-visible:border-teal-500 dark:border-white/10 dark:bg-white/5"
                />
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom"
                  className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm outline-none focus-visible:border-teal-500 dark:border-white/10 dark:bg-white/5"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="col-span-1 rounded-xl border border-black/10 bg-white/60 px-2 py-2 text-sm outline-none focus-visible:border-teal-500 dark:border-white/10 dark:bg-white/5"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
                <input
                  required
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Numéro de téléphone"
                  className="col-span-2 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm outline-none focus-visible:border-teal-500 dark:border-white/10 dark:bg-white/5"
                />
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting || !currentPrice}
                className="w-full rounded-full bg-teal-600 px-5 py-3 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-60"
              >
                {isSubmitting ? "Redirection vers le paiement…" : "Payer avec Chariow"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-500">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Paiement sécurisé par Chariow. Votre accès est lié à votre compte Google
          ({isAuthenticated ? "connecté" : "à connecter"}).
        </p>
      </div>
    </section>
  );
}
