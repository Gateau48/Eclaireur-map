/**
 * Métadonnées COMMERCIALES d'une édition (prix, miniature) — séparées du
 * CONTENU éditorial (promoteurs/projets), qui vit maintenant dans
 * data/editions/*.json + Supabase (voir lib/editions.server.ts). Une
 * édition reste une petite liste connue à l'avance, donc une config
 * statique en code est suffisante ici.
 */
export interface EditionConfig {
  id: string;
  name: string;
  thumbnailUrl: string;
  chariowProductId: string;
}

export const EDITIONS_CONFIG: Record<string, EditionConfig> = {
  dakar: {
    id: "dakar",
    name: "Dakar",
    thumbnailUrl: "https://picsum.photos/seed/eclaireur-dakar/800/600",
    chariowProductId: process.env.CHARIOW_DAKAR_PRODUCT_ID ?? "dakar-edition"
  }
};

export function getEditionConfig(id: string): EditionConfig | null {
  return EDITIONS_CONFIG[id] ?? null;
}

export function getAllEditionConfigs(): EditionConfig[] {
  return Object.values(EDITIONS_CONFIG);
}