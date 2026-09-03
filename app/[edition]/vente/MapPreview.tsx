import { MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Aperçu purement décoratif (pas de vraie carte MapLibre — trop lourd pour
 * une page marketing) mais construit avec les MÊMES classes que le vrai
 * produit (`glass`, couleurs de statut, rayons) pour donner une idée
 * fidèle, pas une capture d'écran figée qui se démode.
 *
 * Responsive par breakpoint CSS uniquement (pas de détection JS de
 * l'appareil) : sur mobile la fiche apparaît en feuille du bas, sur
 * desktop/tablette en panneau latéral — exactement comme la vraie carte,
 * et ça s'adapte tout seul à la largeur réelle de l'écran du visiteur.
 */
export function MapPreview() {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-4xl shadow-hero sm:aspect-[16/10]">
      {/* Fond façon carte : dégradé + grille de rues stylisée */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
        <svg className="absolute inset-0 h-full w-full opacity-[0.15]" aria-hidden>
          <pattern id="streets" width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M0 32H64M32 0V64" stroke="currentColor" strokeWidth="1.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#streets)" />
        </svg>
      </div>

      {/* Points de projet — un seul accent, sobre, pas de code couleur */}
      <span className="absolute left-[20%] top-[24%] size-3 rounded-full border-2 border-white bg-teal-600 shadow" />
      <span className="absolute left-[62%] top-[18%] size-3 rounded-full border-2 border-white bg-teal-600 shadow" />
      <span className="absolute left-[45%] top-[38%] size-3 rounded-full border-2 border-white bg-teal-600 shadow" />
      <span className="absolute left-[30%] top-[55%] size-3 rounded-full border-2 border-white bg-teal-600 shadow" />
      <span className="absolute left-[70%] top-[48%] size-3 rounded-full border-2 border-white bg-teal-600 shadow" />

      {/* Barre de recherche flottante */}
      <div className="glass absolute left-1/2 top-4 w-[calc(100%-2rem)] max-w-[280px] -translate-x-1/2 rounded-full px-4 py-2.5 sm:top-5">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Search className="h-3.5 w-3.5" aria-hidden />
          Chercher un promoteur ou un projet
        </div>
      </div>

      {/* Panneau — feuille du bas sur mobile, panneau latéral à partir de sm */}
      <div
        className={cn(
          "glass absolute rounded-t-4xl p-4",
          "inset-x-0 bottom-0 h-[46%]",
          "sm:inset-y-4 sm:bottom-auto sm:right-4 sm:left-auto sm:h-[calc(100%-2rem)] sm:w-[46%] sm:rounded-4xl"
        )}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-neutral-400/60 sm:hidden" />

        <div className={cn("mb-3 flex items-center gap-2 rounded-2xl bg-black/5 px-3 py-2.5 dark:bg-white/10")}>
          <MapPin className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
          <div className="h-2 w-1/2 rounded-full bg-black/15 dark:bg-white/20" />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-1.5">
          <div className="aspect-[4/3] rounded-xl bg-black/10 dark:bg-white/10" />
          <div className="aspect-[4/3] rounded-xl bg-black/10 dark:bg-white/10" />
        </div>

        <div className="space-y-1.5">
          <div className="h-2 w-2/3 rounded-full bg-black/10 dark:bg-white/10" />
          <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10" />
          <div className="h-2 w-4/5 rounded-full bg-black/10 dark:bg-white/10" />
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2 dark:bg-white/5">
          <div className="h-2 w-2/3 rounded-full bg-black/10 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}