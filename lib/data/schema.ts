import { z } from "zod";

export const SourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  date: z.string(),
  type: z.enum(["presse", "justice", "officiel"])
});

export const PointSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal("promoteur"),
  coordinates: z.object({ lat: z.number(), lng: z.number() }),
  status: z.enum(["agree", "rumeur", "confirme"]),
  zoom_min_marker: z.number(),
  zoom_min_label: z.number(),
  summary: z.string(),
  // GARDE-FOU : jamais de point sans source (risque de diffamation).
  sources: z.array(SourceSchema).min(1),
  last_verified: z.string()
});

export const ZoneDataSchema = z.object({
  zone_id: z.string(),
  zone_name: z.string(),
  zone_center: z.object({ lat: z.number(), lng: z.number() }),
  points: z.array(PointSchema)
});

export type Source = z.infer<typeof SourceSchema>;
export type Point = z.infer<typeof PointSchema>;
export type ZoneData = z.infer<typeof ZoneDataSchema>;

/** Valide une zone au chargement ; fait échouer bruyamment plutôt que de
 *  laisser passer un point sans source (voir Partie 3.2 du brief). */
export function parseZoneData(raw: unknown, label: string): ZoneData {
  const result = ZoneDataSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Données de zone invalides (${label}) : ${result.error.message}`
    );
  }
  return result.data;
}

export const STATUS_LABELS: Record<Point["status"], string> = {
  agree: "Agréé",
  rumeur: "Rumeur non confirmée",
  confirme: "Confirmé"
};

export const STATUS_DOT_CLASS: Record<Point["status"], string> = {
  agree: "bg-emerald-400",
  rumeur: "bg-amber-400",
  confirme: "bg-red-400"
};

export const STATUS_BADGE_CLASS: Record<Point["status"], string> = {
  agree: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-300",
  rumeur: "bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300",
  confirme: "bg-red-100 text-red-800 dark:bg-red-400/20 dark:text-red-300"
};
