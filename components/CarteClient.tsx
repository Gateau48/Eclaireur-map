"use client";

import { useEffect, useState } from "react";
import { Map, MapControls, MapMarker, MarkerContent, MarkerLabel, MarkerTooltip, useMap } from "@/components/ui/map";
import { SearchBar, type SearchResult } from "@/components/search/SearchBar";
import { DetailPanel } from "@/components/detail/DetailPanel";
import { STATUS_DOT_CLASS, type Point } from "@/lib/data/schema";
import type { Edition } from "@/lib/data/editions";
import { cn } from "@/lib/utils";

export function CarteClient({ edition }: { edition: Edition }) {
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

  // La carte gère son propre déplacement via ses gestes — pas de scroll de
  // page sur cette route (Partie 4 du brief).
  useEffect(() => {
    document.body.classList.add("map-route");
    return () => document.body.classList.remove("map-route");
  }, []);

  // Toutes les zones de l'édition sont centrées sur la première par défaut ;
  // un vrai déploiement multi-zone pourrait ajouter un sélecteur de zone.
  const primaryZone = edition.zones[0];

  function handleSelectSearchResult(result: SearchResult) {
    setSelectedPoint(result.point);
  }

  return (
    <div className="absolute inset-0 h-full w-full">
      {/* Couche 0 */}
      <Map
        center={[primaryZone.zone_center.lng, primaryZone.zone_center.lat]}
        zoom={12}
      >
        {edition.zones.map((zone) => (
          <ZonePoints key={zone.zone_id} points={zone.points} onSelect={setSelectedPoint} />
        ))}

        {/* Couche 1 — contrôles flottants */}
        <MapControls className="absolute bottom-6 right-4 z-10" />
        <SheetPadder selectedPoint={selectedPoint} />
      </Map>

      <SearchBar
        zones={edition.zones}
        onSelect={handleSelectSearchResult}
      />

      {/* Couche 2 — panneau de détail (Vaul) */}
      <DetailPanel
        point={selectedPoint}
        onClose={() => setSelectedPoint(null)}
        onSheetHeightChange={(heightPx) => {
          // géré dans SheetPadder via le contexte de carte
          sheetHeightListeners.forEach((fn) => fn(heightPx));
        }}
      />
    </div>
  );
}

/** Petit registre d'écouteurs pour transmettre la hauteur de la feuille au
 *  composant interne à <Map> (qui a seul accès à l'instance MapLibre via
 *  useMap()), sans faire remonter l'instance de carte plus haut. */
const sheetHeightListeners = new Set<(heightPx: number) => void>();

function SheetPadder({ selectedPoint }: { selectedPoint: Point | null }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map) return;
    const listener = (heightPx: number) => {
      map.easeTo({ padding: { bottom: heightPx, top: 0, left: 0, right: 0 }, duration: 300 });
    };
    sheetHeightListeners.add(listener);
    return () => {
      sheetHeightListeners.delete(listener);
    };
  }, [map]);

  // Recentre le point sélectionné au-dessus du panneau à l'ouverture.
  useEffect(() => {
    if (!map || !selectedPoint) return;
    map.easeTo({
      center: [selectedPoint.coordinates.lng, selectedPoint.coordinates.lat],
      duration: 300
    });
  }, [map, selectedPoint]);

  return null;
}

function ZonePoints({
  points,
  onSelect
}: {
  points: Point[];
  onSelect: (point: Point) => void;
}) {
  const { zoom } = useMap();
  // Throttle : arrondir le zoom à l'entier le plus proche avant de filtrer,
  // pour éviter des re-renders excessifs pendant un pincement continu.
  const roundedZoom = Math.round(zoom);

  const visiblePoints = points.filter((p) => roundedZoom >= p.zoom_min_marker);

  return (
    <>
      {visiblePoints.map((point) => (
        <MapMarker
          key={point.id}
          longitude={point.coordinates.lng}
          latitude={point.coordinates.lat}
        >
          <MarkerContent>
            <div className="group relative">
              <div
                onClick={() => onSelect(point)}
                role="button"
                tabIndex={0}
                aria-label={point.name}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelect(point);
                }}
                className={cn(
                  "size-4 cursor-pointer rounded-full border-2 border-white shadow-lg transition-transform hover:scale-110",
                  STATUS_DOT_CLASS[point.status]
                )}
              />
              <MarkerTooltip>{point.name}</MarkerTooltip>
            </div>
          </MarkerContent>
          {roundedZoom >= point.zoom_min_label && (
            <MarkerLabel position="bottom">{point.name}</MarkerLabel>
          )}
        </MapMarker>
      ))}
    </>
  );
}
