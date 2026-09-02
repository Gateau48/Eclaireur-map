import type { LucideIcon } from "lucide-react";
import { AlertOctagon, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Point } from "./schema";

/**
 * RÈGLE DE CLASSIFICATION — pas un classement, une preuve.
 *
 * Ceci n'est PAS un score comparatif entre promoteurs ("qui est le
 * meilleur") : c'est un niveau de preuve, évalué indépendamment pour
 * chaque projet, contre une barre précise. Deux projets "agréé" ne sont
 * pas "à égalité" l'un avec l'autre, ils satisfont chacun le même critère
 * minimal. Ce fichier est la SEULE source de vérité pour ces critères :
 * le contenu du panneau (lib/status.ts → StatusLegend.tsx), la doc, et
 * toute personne qui alimente data/*.json doivent s'y référer — jamais de
 * statut posé "au feeling".
 */
export const STATUS_CRITERIA: Record<Point["status"], string> = {
  agree:
    "Un document officiel positif existe et a été consulté (permis de construire ou d'aménager, cadastre, communiqué administratif), et aucune source officielle ou judiciaire ne signale de litige en cours.",
  rumeur:
    "Au moins un signalement existe (témoignage, article de presse, publication sur les réseaux sociaux) suggérant une irrégularité possible, mais aucune source officielle ou judiciaire ne le confirme à ce jour. Statut réexaminé dès qu'une source plus solide apparaît.",
  confirme:
    "Au moins une source officielle ou judiciaire (jugement, décision administrative, communiqué ministériel) confirme une irrégularité concrète — vente sans titre, double vente, terrain non constructible, etc."
};

export const STATUS_LABELS: Record<Point["status"], string> = {
  agree: "Agréé",
  rumeur: "Rumeur non confirmée",
  confirme: "Confirmé"
};

export const STATUS_ICONS: Record<Point["status"], LucideIcon> = {
  agree: CheckCircle2,
  rumeur: AlertTriangle,
  confirme: AlertOctagon
};

/** Couleur pleine — réservée aux PETITS éléments (points sur la carte,
 *  puces de statut dans une liste) où la lisibilité à distance prime sur
 *  la retenue esthétique. Ne jamais utiliser sur une grande surface. */
export const STATUS_SOLID_CLASS: Record<Point["status"], string> = {
  agree: "bg-emerald-400",
  rumeur: "bg-amber-400",
  confirme: "bg-red-500"
};

/** Teinte douce — pour les grandes surfaces (bandeau du panneau de
 *  détail) : fond pastel + texte/icône de la même teinte, jamais un aplat
 *  saturé. C'est le traitement "épuré" façon Apple Health/Wallet. */
export const STATUS_SOFT_CLASS: Record<Point["status"], string> = {
  agree: "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300",
  rumeur: "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300",
  confirme: "bg-red-50 text-red-800 dark:bg-red-400/10 dark:text-red-300"
};

export const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  foncier: "Foncier",
  urbanisme: "Urbanisme",
  financier: "Financier",
  livraison: "Livraison"
};

/** Icône légèrement plus saturée que le texte, pour ancrer le regard sans
 *  revenir à un aplat plein. */
export const STATUS_ICON_CLASS: Record<Point["status"], string> = {
  agree: "text-emerald-600 dark:text-emerald-400",
  rumeur: "text-amber-600 dark:text-amber-400",
  confirme: "text-red-600 dark:text-red-400"
};