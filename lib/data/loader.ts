import { ZoneDataSchema, type ZoneData } from './schema';

const ZONES_PER_EDITION: Record<string, string[]> = {
  dakar: ['almadies', 'diamniadio', 'rufisque'],
};

export async function getEditionData(slug: string): Promise<ZoneData[]> {
  const zones = ZONES_PER_EDITION[slug];
  if (!zones) return [];

  const results = await Promise.all(
    zones.map(async (zone) => {
      try {
        const mod = await import(`@/data/${slug}/${zone}.json`);
        return ZoneDataSchema.parse(mod.default);
      } catch (e) {
        console.error(`Failed to load or validate zone ${zone}:`, e);
        return null;
      }
    })
  );

  return results.filter((z): z is ZoneData => z !== null);
}

export async function getZoneData(editionSlug: string, zoneId: string): Promise<ZoneData | null> {
  try {
    const mod = await import(`@/data/${editionSlug}/${zoneId}.json`);
    return ZoneDataSchema.parse(mod.default);
  } catch {
    return null;
  }
}

export function getAvailableEditions(): string[] {
  return Object.keys(ZONES_PER_EDITION);
}
