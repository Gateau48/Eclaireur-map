import { z } from "zod";

/**
 * SCHÉMA DE DONNÉES — verrouillé avant toute collecte (voir spec produit,
 * point 30 : "il faut verrouiller le schéma JSON définitif").
 *
 * Principes qui gouvernent chaque choix ci-dessous :
 * - PUBLIC   : uniquement des informations publiques.
 * - SOURCÉ   : toute information importante référence une source (via
 *              source_id), jamais une affirmation flottante.
 * - FACTUEL  : pas de champ "status/confiance/verdict" — un projet a un
 *              statut D'AVANCEMENT (commercialisation, en construction...),
 *              jamais un statut de fiabilité. Les points d'attention sont
 *              des faits documentés, pas des jugements (voir
 *              PublicInformationItemSchema).
 * - COMPLET MAIS SOBRE : champs extensibles (characteristics, units) sans
 *              liste rigide, mais rien n'est inventé — la précision de
 *              localisation est une donnée à part entière, jamais implicite.
 */

// ---------------------------------------------------------------------------
// Sources — fondamentales, référencées par id depuis n'importe quel champ
// ---------------------------------------------------------------------------

export const SourceTypeSchema = z.enum([
  "site_officiel_promoteur",
  "site_officiel_entreprise",
  "media",
  "article_presse",
  "communique",
  "document_public",
  "annonce_immobiliere",
  "reseau_social",
  "institutionnel",
  "autre"
]);

export const SourceSchema = z.object({
  id: z.string(), // référencé par source_id ailleurs dans le projet/promoteur
  type: SourceTypeSchema,
  title: z.string(),
  url: z.string().url(),
  // Distinction volontaire : une info peut avoir été publiée à une date et
  // consultée (vérifiée) à une autre — les deux comptent pour contextualiser
  // le prix ou un point d'attention.
  published_at: z.string().optional(),
  accessed_at: z.string()
});
export type Source = z.infer<typeof SourceSchema>;

export const SOURCE_TYPE_LABELS: Record<z.infer<typeof SourceTypeSchema>, string> = {
  site_officiel_promoteur: "Site officiel du promoteur",
  site_officiel_entreprise: "Site officiel d'entreprise",
  media: "Média",
  article_presse: "Article de presse",
  communique: "Communiqué",
  document_public: "Document public",
  annonce_immobiliere: "Annonce immobilière",
  reseau_social: "Publication publique (réseau social)",
  institutionnel: "Source institutionnelle",
  autre: "Autre source"
};

// ---------------------------------------------------------------------------
// Localisation — la précision est une donnée à part entière, jamais inventée
// ---------------------------------------------------------------------------

export const LocationPrecisionSchema = z.enum(["exact", "approximate", "district"]);

export const LocationSchema = z
  .object({
    address: z.string().optional(),
    district: z.string().optional(),
    city: z.string(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    precision: LocationPrecisionSchema
  })
  .refine((loc) => loc.precision !== "exact" || (loc.latitude !== null && loc.longitude !== null), {
    message:
      "precision 'exact' exige latitude/longitude renseignées — jamais de coordonnées devinées pour un projet marqué exact.",
    path: ["latitude"]
  });
export type Location = z.infer<typeof LocationSchema>;

// ---------------------------------------------------------------------------
// Prix — jamais une valeur nue, toujours contextualisé (type, devise, source, dates)
// ---------------------------------------------------------------------------

export const PriceTypeSchema = z.enum(["starting_from", "range", "fixed", "per_sqm"]);

export const PriceSchema = z
  .object({
    type: PriceTypeSchema,
    value: z.number().optional(), // pour "fixed" / "starting_from" / "per_sqm"
    min: z.number().optional(), // pour "range"
    max: z.number().optional(),
    currency: z.string(), // code ISO 4217, ex. "XOF"
    source_id: z.string(),
    published_at: z.string().optional(),
    accessed_at: z.string()
  })
  .refine((p) => p.type !== "range" || (p.min !== undefined && p.max !== undefined), {
    message: "type 'range' exige min et max",
    path: ["min"]
  })
  .refine((p) => p.type === "range" || p.value !== undefined, {
    message: "value est requis sauf pour type 'range'",
    path: ["value"]
  });
export type Price = z.infer<typeof PriceSchema>;

// ---------------------------------------------------------------------------
// Caractéristiques — extensibles, jamais une liste rigide (point 8/21 de la spec)
// ---------------------------------------------------------------------------

export const CharacteristicSchema = z.object({
  label: z.string(), // ex. "Piscine", "Nombre d'étages", "Architecte"
  value: z.string() // toujours une chaîne d'affichage, ex. "Oui", "R+8"
});
export type Characteristic = z.infer<typeof CharacteristicSchema>;

export const UnitSchema = z.object({
  typology: z.string(), // ex. "3 pièces", "Villa T4"
  surface_sqm: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  price: PriceSchema.optional()
});
export type Unit = z.infer<typeof UnitSchema>;

// ---------------------------------------------------------------------------
// Timeline — historique du projet
// ---------------------------------------------------------------------------

export const TimelineEntrySchema = z.object({
  date: z.string(), // peut être partielle : "2024-03" ou seulement "2024"
  label: z.string(), // ex. "Lancement commercial", "Début des travaux"
  source_id: z.string().optional()
});
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

// ---------------------------------------------------------------------------
// "À savoir" — fait documenté et sourcé, JAMAIS un jugement (point 13 de la spec)
// ---------------------------------------------------------------------------
//
// GARDE-FOU DE FORMULATION (à respecter dans les données, pas seulement le
// code) : `title`/`description` décrivent un fait ("Procédure judiciaire
// rapportée par la presse en 2026"), jamais une conclusion ("Ce promoteur
// est peu fiable"). Distinguer explicitement "aucune information publique
// trouvée" (silence de la recherche) de "aucun problème n'existe" (garantie
// que Éclaireur ne peut pas donner) — un item de cette liste n'apparaît que
// s'il y a un fait positif à rapporter ; l'absence de la section entière
// signifie "rien trouvé", jamais "rien à signaler".

export const PublicInformationItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  source_id: z.string()
});
export type PublicInformationItem = z.infer<typeof PublicInformationItemSchema>;

// ---------------------------------------------------------------------------
// Statut du projet — un AVANCEMENT, jamais un verdict de confiance
// ---------------------------------------------------------------------------

export const ProjectPhaseSchema = z.enum([
  "annonce",
  "commercialisation",
  "en_construction",
  "livre",
  "suspendu",
  "inconnu"
]);

export const ProjectStatusSchema = z.object({
  phase: ProjectPhaseSchema,
  detail: z.string().optional(), // ex. "Livraison annoncée pour Q4 2027"
  source_id: z.string().optional()
});

export type ProjectPhase = z.infer<typeof ProjectPhaseSchema>;

export const PROJECT_PHASE_LABELS: Record<ProjectPhase, string> = {
  annonce: "Annoncé",
  commercialisation: "En commercialisation",
  en_construction: "En construction",
  livre: "Livré",
  suspendu: "Suspendu",
  inconnu: "Avancement inconnu"
};

// ---------------------------------------------------------------------------
// Projet
// ---------------------------------------------------------------------------

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Absent de la spec initiale mais nécessaire pour le HEADER du panneau
  // (voir demande explicite : l'image est candidate prioritaire). Comme
  // tout le reste : absent = pas affiché, jamais un placeholder gris.
  cover_image_url: z.string().url().optional(),
  location: LocationSchema,
  status: ProjectStatusSchema.optional(),
  pricing: z
    .object({
      summary: PriceSchema.optional(),
      by_unit: z.array(UnitSchema).optional()
    })
    .optional(),
  characteristics: z.array(CharacteristicSchema).optional(),
  timeline: z.array(TimelineEntrySchema).optional(),
  public_information: z.array(PublicInformationItemSchema).optional(),
  // Confiance dans la complétude/fraîcheur de CE projet — utile en interne
  // pour prioriser la recherche complémentaire, pas affiché comme un badge
  // de fiabilité du promoteur (voir principe FACTUEL ci-dessus).
  data_quality: z.enum(["high", "medium", "low"]).optional(),
  last_verified: z.string().optional(),
  // GARDE-FOU : au moins une source par projet — même un projet avec peu
  // d'informations doit pouvoir justifier ce qu'il affiche.
  sources: z.array(SourceSchema).min(1)
});
export type Project = z.infer<typeof ProjectSchema>;

// ---------------------------------------------------------------------------
// Promoteur — entité indépendante, porteuse de plusieurs projets
// ---------------------------------------------------------------------------

export const PromoterSchema = z.object({
  id: z.string(),
  name: z.string(),
  legal_name: z.string().optional(),
  photo_url: z.string().url().optional(),
  company: z
    .object({
      activity: z.string().optional(),
      founded_year: z.number().optional(),
      website: z.string().url().optional()
    })
    .optional(),
  public_information: z.array(PublicInformationItemSchema).optional(),
  // Les sources du promoteur lui-même (au-delà de celles de chaque projet)
  // peuvent être vides — un promoteur peut n'avoir que ses projets comme
  // trace publique.
  sources: z.array(SourceSchema).optional().default([]),
  projects: z.array(ProjectSchema).min(1)
});
export type Promoter = z.infer<typeof PromoterSchema>;

// ---------------------------------------------------------------------------
// Édition — zone géographique (pas un pays), voir logique des éditions
// ---------------------------------------------------------------------------

export const EditionDataSchema = z.object({
  edition_id: z.string(),
  edition_name: z.string(),
  promoters: z.array(PromoterSchema)
});
export type EditionData = z.infer<typeof EditionDataSchema>;

/** Valide un fichier d'édition ; fait échouer bruyamment plutôt que de
 *  laisser passer un projet sans source ou des coordonnées inventées. */
export function parseEditionData(raw: unknown, label: string): EditionData {
  const result = EditionDataSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Données d'édition invalides (${label}) : ${result.error.message}`);
  }

  // GARDE-FOU supplémentaire : tout source_id référencé (prix, timeline,
  // point d'attention) doit exister dans le tableau `sources` du projet ou
  // du promoteur concerné — sinon une info "sourcée" pointerait dans le
  // vide.
  for (const promoter of result.data.promoters) {
    const promoterSourceIds = new Set(promoter.sources.map((s) => s.id));
    for (const project of promoter.projects) {
      const projectSourceIds = new Set([...promoterSourceIds, ...project.sources.map((s) => s.id)]);
      const referenced: (string | undefined)[] = [
        project.pricing?.summary?.source_id,
        ...(project.pricing?.by_unit?.map((u) => u.price?.source_id) ?? []),
        ...(project.timeline?.map((t) => t.source_id) ?? []),
        ...(project.public_information?.map((p) => p.source_id) ?? [])
      ];
      for (const sourceId of referenced) {
        if (sourceId && !projectSourceIds.has(sourceId)) {
          throw new Error(
            `Édition "${label}" : le projet "${project.id}" référence source_id "${sourceId}" introuvable dans ses sources (ou celles de son promoteur).`
          );
        }
      }
    }
  }

  return result.data;
}

/** Regroupe les sources d'un projet par type, pour un affichage "Sources —
 *  N" qui se déplie en catégories neutres (point 12 de la spec : pas de
 *  code couleur, de la typographie et des sections). */
export function groupSourcesByType(sources: Source[]) {
  const byType = new Map<Source["type"], Source[]>();
  for (const source of sources) {
    const list = byType.get(source.type) ?? [];
    list.push(source);
    byType.set(source.type, list);
  }
  return Array.from(byType.entries()).map(([type, items]) => ({
    type,
    label: SOURCE_TYPE_LABELS[type],
    items
  }));
}