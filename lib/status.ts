import type { ProjectPhase } from "./schema";

/**
 * Couleurs de marqueurs sur la carte — une couleur par phase de projet.
 * Basé sur les tokens `status.*` du tailwind.config.ts.
 */
export const PHASE_MARKER_COLOR: Record<ProjectPhase, string> = {
  annonce: "bg-sky-500",
  commercialisation: "bg-emerald-500",
  en_construction: "bg-amber-500",
  livre: "bg-neutral-400",
  suspendu: "bg-red-500",
  inconnu: "bg-neutral-300"
};

/**
 * Couleurs du tag de status dans le drawer — texte coloré sans fond.
 */
export const PHASE_TAG_COLOR: Record<ProjectPhase, string> = {
  annonce: "text-sky-600",
  commercialisation: "text-emerald-600",
  en_construction: "text-amber-600",
  livre: "text-neutral-500",
  suspendu: "text-red-500",
  inconnu: "text-neutral-400"
};
