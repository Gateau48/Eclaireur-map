import type { Zone } from './types';

export function geojsonFromZoneData(zoneData: Zone): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: zoneData.points.map((p) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [p.coordinates.lng, p.coordinates.lat],
      },
      properties: {
        ...p,
        coordinates: undefined,
      },
    })),
  };
}
