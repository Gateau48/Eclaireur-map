import type { ZoneData } from "./schema";

/**
 * Convertit une zone en FeatureCollection GeoJSON.
 * Utile si un jour une zone dépasse plusieurs milliers de points et qu'il
 * faut passer d'une approche MapMarker (DOM) à une source GeoJSON + layer
 * (voir Partie 2.1, garde-fou de performance mapcn).
 */
export function geojsonFromZoneData(
  zoneData: ZoneData
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: zoneData.points.map((p) => {
      const { coordinates, ...rest } = p;
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [coordinates.lng, coordinates.lat]
        },
        properties: rest
      };
    })
  };
}
