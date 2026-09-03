import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Clock, HelpCircle, PauseCircle, Tag } from "lucide-react";
import { PROJECT_PHASE_LABELS, type ProjectPhase } from "./schema";

export const PHASE_ICONS: Record<ProjectPhase, LucideIcon> = {
  annonce: Tag,
  commercialisation: CheckCircle2,
  en_construction: Clock,
  livre: CheckCircle2,
  suspendu: PauseCircle,
  inconnu: HelpCircle
};

/** Couleur pleine — réservée aux PETITS éléments (marqueurs sur la carte). */
export const PHASE_SOLID_CLASS: Record<ProjectPhase, string> = {
  annonce: "bg-sky-400",
  commercialisation: "bg-emerald-400",
  en_construction: "bg-amber-400",
  livre: "bg-neutral-400",
  suspendu: "bg-red-400",
  inconnu: "bg-neutral-300"
};

/** Teinte douce — pour les grandes surfaces (bandeau du panneau de détail). */
export const PHASE_SOFT_CLASS: Record<ProjectPhase, string> = {
  annonce: "bg-sky-50 text-sky-800 dark:bg-sky-400/10 dark:text-sky-300",
  commercialisation: "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300",
  en_construction: "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300",
  livre: "bg-neutral-50 text-neutral-800 dark:bg-neutral-400/10 dark:text-neutral-300",
  suspendu: "bg-red-50 text-red-800 dark:bg-red-400/10 dark:text-red-300",
  inconnu: "bg-neutral-50 text-neutral-600 dark:bg-neutral-400/10 dark:text-neutral-400"
};

export const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  foncier: "Foncier",
  urbanisme: "Urbanisme",
  financier: "Financier",
  livraison: "Livraison"
};
