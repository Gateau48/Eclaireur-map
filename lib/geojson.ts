import type { EditionData, Project, Promoter } from "./schema";

export interface GeoProject {
  project: Project;
  promoter: Promoter;
}

/**
 * Convertit une édition en FeatureCollection GeoJSON.
 * Utile si un jour le nombre de projets dépasse plusieurs milliers et qu'il
 * faut passer d'une approche MapMarker (DOM) à une source GeoJSON + layer
 * (voir Partie 2.1, garde-fou de performance mapcn).
 */
export function geojsonFromEditionData(edition: EditionData): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const promoter of edition.promoters) {
    for (const project of promoter.projects) {
      if (project.location.latitude !== null && project.location.longitude !== null) {
        features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [project.location.longitude, project.location.latitude]
          },
          properties: { id: project.id, name: project.name }
        });
      }
    }
  }
  return { type: "FeatureCollection", features };
}
