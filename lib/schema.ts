import { z } from "zod";

/**
 * Une source est rattachée à une catégorie (affichée comme section
 * repliable dans le panneau de détail, cf. maquette) :
 * - officiel        : permis, cadastre, communiqués administratifs
 * - reseaux_sociaux : Instagram, TikTok, Facebook... (label = plateforme,
 *                     description = ce qu'on y a trouvé)
 * - presse          : articles de presse, enquêtes
 * - justice         : jugements, procédures, décisions de tribunal
 */
export const SourceSchema = z.object({
  category: z.enum(["officiel", "reseaux_sociaux", "presse", "justice"]),
  label: z.string(), // ex. "Permis de construire", "Instagram"
  description: z.string().optional(), // ex. "Témoignages clients"
  url: z.string().url(),
  date: z.string()
});

export const PromoterSchema = z.object({
  id: z.string(),
  name: z.string(),
  quartier: z.string(),
  years_experience: z.number().int().nonnegative(),
  certified: z.boolean(),
  property_count: z.number().int().nonnegative(),
  photo_url: z.string().url(),
  // Numéro d'immatriculation officiel (RCCM ou équivalent), quand connu —
  // renforce la vérifiabilité du profil dans l'onglet Promoteur.
  registration_number: z.string().optional(),
  // Puces factuelles affichées sous "À propos" — jamais un paragraphe brut :
  // chaque puce est une observation vérifiable et sourcée.
  about: z.array(z.string()).min(1),
  // GARDE-FOU : jamais de promoteur sans source — un profil sans preuve
  // ne doit jamais s'afficher (risque de diffamation).
  sources: z.array(SourceSchema).min(1)
});

export const PointSchema = z
  .object({
    id: z.string(),
    name: z.string(), // nom du projet, ex. "Résidence Baobab Bay"
    promoter_id: z.string(),
    coordinates: z.object({ lat: z.number(), lng: z.number() }),
    status: z.enum(["agree", "rumeur", "confirme"]),
    // Nature du problème signalé — voir lib/status.ts. Absent quand
    // status === "agree" (rien à signaler) ; attendu sinon.
    issue_category: z.enum(["foncier", "urbanisme", "financier", "livraison"]).optional(),
    zoom_min_marker: z.number(),
    zoom_min_label: z.number(),
    summary: z.string(),
    project_photo_url: z.string().url(),
    // GARDE-FOU : jamais de projet sans source propre.
    sources: z.array(SourceSchema).min(1),
    last_verified: z.string()
  })
  .refine((p) => p.status === "agree" || !!p.issue_category, {
    message: "issue_category est requis dès que status n'est pas 'agree'",
    path: ["issue_category"]
  });

export const ZoneDataSchema = z.object({
  zone_id: z.string(),
  zone_name: z.string(),
  zone_center: z.object({ lat: z.number(), lng: z.number() }),
  promoters: z.array(PromoterSchema).min(1),
  points: z.array(PointSchema)
});

export type Source = z.infer<typeof SourceSchema>;
export type Promoter = z.infer<typeof PromoterSchema>;
export type Point = z.infer<typeof PointSchema>;
export type ZoneData = z.infer<typeof ZoneDataSchema>;

/** Valide une zone au chargement ; fait échouer bruyamment plutôt que de
 *  laisser passer un point/promoteur sans source. */
export function parseZoneData(raw: unknown, label: string): ZoneData {
  const result = ZoneDataSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Données de zone invalides (${label}) : ${result.error.message}`
    );
  }
  const data = result.data;
  // GARDE-FOU supplémentaire : chaque point doit référencer un promoteur existant.
  const promoterIds = new Set(data.promoters.map((p) => p.id));
  for (const point of data.points) {
    if (!promoterIds.has(point.promoter_id)) {
      throw new Error(
        `Zone "${label}" : le point "${point.id}" référence un promoteur inconnu (${point.promoter_id}).`
      );
    }
  }
  return data;
}

// Les constantes de statut (libellés, couleurs) vivent dans lib/status.ts,
// seule source de vérité, référencée depuis le panneau, la carte et la
// légende — voir lib/status.ts pour les critères de classification.

export const SOURCE_CATEGORY_LABELS: Record<Source["category"], string> = {
  officiel: "Sites officiels",
  reseaux_sociaux: "Réseaux sociaux",
  presse: "Presse",
  justice: "Justice"
};

/** Regroupe une liste de sources par catégorie, en conservant l'ordre défini
 *  par SOURCE_CATEGORY_LABELS, pour les sections repliables du panneau. */
export function groupSourcesByCategory(sources: Source[]) {
  const order: Source["category"][] = [
    "officiel",
    "reseaux_sociaux",
    "presse",
    "justice"
  ];
  return order
    .map((category) => ({
      category,
      label: SOURCE_CATEGORY_LABELS[category],
      items: sources.filter((s) => s.category === category)
    }))
    .filter((group) => group.items.length > 0);
}

export function findPromoter(
  promoters: Promoter[],
  id: string
): Promoter | undefined {
  return promoters.find((p) => p.id === id);
}