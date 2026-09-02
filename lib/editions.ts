import almadiesRaw from "@/data/dakar/almadies.json";
import diamniadioRaw from "@/data/dakar/diamniadio.json";
import rufisqueRaw from "@/data/dakar/rufisque.json";
import { parseZoneData, type ZoneData } from "@/lib/schema";

export interface Edition {
  id: string;
  name: string;
  thumbnailUrl: string;
  chariowProductId: string;
  zones: ZoneData[];
}

// Import direct en haut du fichier — jamais un fetch réseau côté client,
// les données sont statiques et connues au build (Partie 3.1 du brief).
const dakarZones: ZoneData[] = [
  parseZoneData(almadiesRaw, "almadies"),
  parseZoneData(diamniadioRaw, "diamniadio"),
  parseZoneData(rufisqueRaw, "rufisque")
];

export const EDITIONS: Record<string, Edition> = {
  dakar: {
    id: "dakar",
    name: "Dakar",
    thumbnailUrl: "https://picsum.photos/seed/eclaireur-dakar/800/600",
    chariowProductId: process.env.CHARIOW_DAKAR_PRODUCT_ID ?? "dakar-edition",
    zones: dakarZones
  }
};

export function getEdition(id: string): Edition | null {
  return EDITIONS[id] ?? null;
}

export function getAllEditions(): Edition[] {
  return Object.values(EDITIONS);
}