"use client";

import { useEffect, useState } from "react";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerTooltip,
  useMap
} from "@/components/ui/map";
import { SearchBar, type SearchResult } from "@/components/SearchBar";
import { DetailPanel } from "@/components/DetailPanel";
import { findPromoter, STATUS_DOT_CLASS, type Point, type Promoter } from "@/lib/schema";
import type { Edition } from "@/lib/editions";
import { cn } from "@/lib/utils";

interface Selection {
  point: Point;
  promoter: Promoter;
  initialTab: "projet" | "promoteur";
}

export function CarteClient({ edition }: { edition: Edition }) {
  const [selection, setSelection] = useState<Selection | null>(null);

  // La carte gère son propre déplacement via ses gestes — pas de scroll de
  // page sur cette route.
  useEffect(() => {
    document.body.classList.add("map-route");
    return () => document.body.classList.remove("map-route");
  }, []);

  const primaryZone = edition.zones[0];

  function selectPoint(zoneId: string, point: Point, initialTab: "projet" | "promoteur" = "projet") {
    const zone = edition.zones.find((z) => z.zone_id === zoneId);
    if (!zone) return;
    const promoter = findPromoter(zone.promoters, point.promoter_id);
    if (!promoter) return;
    setSelection({ point, promoter, initialTab });
  }

  function handleSelectSearchResult(result: SearchResult) {
    const zone = edition.zones.find((z) =>
      result.kind === "projet"
        ? z.points.some((p) => p.id === result.point.id)
        : z.promoters.some((p) => p.id === result.promoter.id)
    );
    if (!zone) return;

    if (result.kind === "projet") {
      setSelection({ point: result.point, promoter: result.promoter, initialTab: "projet" });
    } else {
      setSelection({ point: result.primaryPoint, promoter: result.promoter, initialTab: "promoteur" });
    }
  }

  return (
    <div className="absolute inset-0 h-full w-full">
      {/* Couche 0 */}
      <Map center={[primaryZone.zone_center.lng, primaryZone.zone_center.lat]} zoom={12}>
        {edition.zones.map((zone) => (
          <ZonePoints
            key={zone.zone_id}
            points={zone.points}
            onSelect={(point) => selectPoint(zone.zone_id, point)}
          />
        ))}

        {/* Couche 1 — contrôles flottants */}
        <MapControls className="absolute bottom-6 right-4 z-10" />
        <SheetPadder selection={selection} />
      </Map>

      <SearchBar zones={edition.zones} onSelect={handleSelectSearchResult} />

      {/* Couche 2 — panneau de détail (Vaul) */}
      <DetailPanel
        point={selection?.point ?? null}
        promoter={selection?.promoter ?? null}
        initialTab={selection?.initialTab}
        onClose={() => setSelection(null)}
        onSheetHeightChange={(heightPx) => {
          sheetHeightListeners.forEach((fn) => fn(heightPx));
        }}
      />
    </div>
  );
}

/** Registre d'écouteurs pour transmettre la hauteur de la feuille au
 *  composant interne à <Map> (seul à avoir accès à l'instance MapLibre via
 *  useMap()), sans faire remonter l'instance de carte plus haut. */
const sheetHeightListeners = new Set<(heightPx: number) => void>();

function SheetPadder({ selection }: { selection: Selection | null }) {
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
    if (!map || !selection) return;
    map.easeTo({
      center: [selection.point.coordinates.lng, selection.point.coordinates.lat],
      duration: 300
    });
  }, [map, selection]);

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
        <MapMarker key={point.id} longitude={point.coordinates.lng} latitude={point.coordinates.lat}>
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
