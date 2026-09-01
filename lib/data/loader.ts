import { ZoneDataSchema, type ZoneData } from './schema';
import almadies from '@/data/dakar/almadies.json';
import diamniadio from '@/data/dakar/diamniadio.json';
import rufisque from '@/data/dakar/rufisque.json';

const ZONE_MAP: Record<string, Record<string, unknown>> = {
  dakar: {
    almadies,
    diamniadio,
    rufisque,
  },
};

const ZONES_PER_EDITION: Record<string, string[]> = {
  dakar: ['almadies', 'diamniadio', 'rufisque'],
};

export function getEditionData(slug: string): ZoneData[] {
  const zones = ZONES_PER_EDITION[slug];
  if (!zones) return [];

  const editionZones = ZONE_MAP[slug];
  if (!editionZones) return [];

  const results: ZoneData[] = [];
  for (const zone of zones) {
    try {
      const data = editionZones[zone];
      if (data) {
        results.push(ZoneDataSchema.parse(data));
      }
    } catch (e) {
      console.error(`Failed to load or validate zone ${zone}:`, e);
    }
  }

  return results;
}

export function getZoneData(editionSlug: string, zoneId: string): ZoneData | null {
  try {
    const editionZones = ZONE_MAP[editionSlug];
    if (!editionZones) return null;
    const data = editionZones[zoneId];
    if (!data) return null;
    return ZoneDataSchema.parse(data);
  } catch {
    return null;
  }
}

export function getAvailableEditions(): string[] {
  return Object.keys(ZONES_PER_EDITION);
}
