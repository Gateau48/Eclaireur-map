import type { Zone } from './types';

// Dynamic imports for each edition's data
const dataModules: Record<string, () => Promise<{ default: Zone }>> = {
  dakar: () => import('@/data/dakar.json') as Promise<{ default: Zone }>,
  diamniadio: () => import('@/data/diamniadio.json') as Promise<{ default: Zone }>,
  'petite-cote': () => import('@/data/petite-cote.json') as Promise<{ default: Zone }>,
};

export async function getEditionData(slug: string): Promise<Zone | null> {
  const loader = dataModules[slug];
  if (!loader) return null;

  try {
    const module = await loader();
    return module.default;
  } catch {
    return null;
  }
}

export function getAvailableEditions(): string[] {
  return Object.keys(dataModules);
}
