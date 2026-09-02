import type { Point } from "./schema";

export interface PointCluster {
  id: string;
  center: { lat: number; lng: number };
  points: Point[];
  /** Le point de statut le plus préoccupant du groupe — c'est LUI qui
   *  colore la bulle de cluster. Un cluster ne doit jamais moyenner ou
   *  masquer un problème confirmé derrière des points "agréé" voisins :
   *  la sécurité prime sur l'esthétique du regroupement. */
  worstStatus: Point["status"];
}

const STATUS_SEVERITY: Record<Point["status"], number> = { agree: 0, rumeur: 1, confirme: 2 };

/**
 * Regroupe les points visuellement proches à un niveau de zoom donné, pour
 * éviter la "confetti" de dizaines de points collés les uns aux autres
 * quand on dézoome sur toute une édition. Volontairement simple (grille,
 * pas d'algorithme glouton par plus-proche-voisin) : suffisant pour des
 * centaines de points, et un calcul purement mathématique (zoom + latitude
 * de référence), donc pas besoin de réagir au pan de la carte — seul un
 * changement de zoom fait bouger les tailles de grille.
 *
 * @param radiusPx rayon approximatif, en pixels écran, en-dessous duquel
 *   deux points sont regroupés dans le même cluster.
 */
export function clusterPoints(points: Point[], zoom: number, radiusPx = 44): PointCluster[] {
  if (points.length === 0) return [];

  const refLat = points.reduce((sum, p) => sum + p.coordinates.lat, 0) / points.length;

  // Mètres par pixel en projection Web Mercator, à ce zoom et cette latitude.
  const metersPerPixel = (156543.03392 * Math.cos((refLat * Math.PI) / 180)) / 2 ** zoom;
  const cellSizeMeters = radiusPx * metersPerPixel;
  const cellSizeLat = cellSizeMeters / 111_320;
  const cellSizeLng = cellSizeMeters / (111_320 * Math.cos((refLat * Math.PI) / 180) || 1);

  const buckets = new Map<string, Point[]>();
  for (const point of points) {
    const key = `${Math.round(point.coordinates.lat / cellSizeLat)}:${Math.round(
      point.coordinates.lng / cellSizeLng
    )}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(point);
    else buckets.set(key, [point]);
  }

  return Array.from(buckets.entries()).map(([key, groupPoints]) => {
    const center = {
      lat: groupPoints.reduce((s, p) => s + p.coordinates.lat, 0) / groupPoints.length,
      lng: groupPoints.reduce((s, p) => s + p.coordinates.lng, 0) / groupPoints.length
    };
    const worstStatus = groupPoints.reduce<Point["status"]>(
      (worst, p) => (STATUS_SEVERITY[p.status] > STATUS_SEVERITY[worst] ? p.status : worst),
      "agree"
    );
    return { id: `cluster-${key}`, center, points: groupPoints, worstStatus };
  });
}