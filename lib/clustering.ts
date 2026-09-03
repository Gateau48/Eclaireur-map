export interface Clusterable {
  id: string;
  coordinates: { lat: number; lng: number };
}

export interface Cluster<T extends Clusterable> {
  id: string;
  center: { lat: number; lng: number };
  items: T[];
}

/**
 * Regroupe des éléments géolocalisés visuellement proches à un niveau de
 * zoom donné, pour éviter la "confetti" de marqueurs collés quand on
 * dézoome. Générique : ne connaît rien du contenu regroupé (plus de
 * notion de statut à agréger, voir discussion produit — un cluster montre
 * juste un nombre, jamais une couleur de verdict).
 *
 * Grille simple (pas de plus-proche-voisin glouton) : suffisant pour des
 * centaines d'éléments, et un calcul purement mathématique (zoom +
 * latitude de référence) — pas besoin de réagir au pan de la carte, seul
 * un changement de zoom fait bouger la taille de grille.
 */
export function clusterItems<T extends Clusterable>(
  items: T[],
  zoom: number,
  radiusPx = 44
): Cluster<T>[] {
  if (items.length === 0) return [];

  const refLat = items.reduce((sum, p) => sum + p.coordinates.lat, 0) / items.length;

  const metersPerPixel = (156543.03392 * Math.cos((refLat * Math.PI) / 180)) / 2 ** zoom;
  const cellSizeMeters = radiusPx * metersPerPixel;
  const cellSizeLat = cellSizeMeters / 111_320;
  const cellSizeLng = cellSizeMeters / (111_320 * Math.cos((refLat * Math.PI) / 180) || 1);

  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = `${Math.round(item.coordinates.lat / cellSizeLat)}:${Math.round(
      item.coordinates.lng / cellSizeLng
    )}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  return Array.from(buckets.entries()).map(([key, groupItems]) => ({
    id: `cluster-${key}`,
    center: {
      lat: groupItems.reduce((s, p) => s + p.coordinates.lat, 0) / groupItems.length,
      lng: groupItems.reduce((s, p) => s + p.coordinates.lng, 0) / groupItems.length
    },
    items: groupItems
  }));
}