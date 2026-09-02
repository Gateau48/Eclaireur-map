"use client";

import { useEffect, useMemo, useState } from "react";
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
import { StatusLegend } from "@/components/StatusLegend";
import { findPromoter, type Point, type Promoter } from "@/lib/schema";
import { STATUS_SOLID_CLASS } from "@/lib/status";
import { clusterPoints } from "@/lib/clustering";
import type { Edition } from "@/lib/editions";
import { cn } from "@/lib/utils";

interface Selection {
  zoneId: string;
  point: Point;
  promoter: Promoter;
  initialTab: "projet" | "promoteur";
  // Autres projets du même promoteur dans la zone, pour le renvoi croisé de
  // risque dans le panneau (ex. "ce promoteur a aussi un projet confirmé
  // ailleurs") — voir DetailPanel.tsx.
  otherPointsFromPromoter: Point[];
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

  // Lookup pointId -> zoneId : les marqueurs sont maintenant rendus tous
  // ensemble (voir AllPoints ci-dessous), pas zone par zone, pour que le
  // clustering fonctionne aussi entre zones proches, pas seulement à
  // l'intérieur d'une même zone.
  const zoneIdByPointId = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const zone of edition.zones) {
      for (const point of zone.points) lookup[point.id] = zone.zone_id;
    }
    return lookup;
  }, [edition]);

  const allPoints = useMemo(() => edition.zones.flatMap((z) => z.points), [edition]);

  function selectPoint(zoneId: string, point: Point, initialTab: "projet" | "promoteur" = "projet") {
    const zone = edition.zones.find((z) => z.zone_id === zoneId);
    if (!zone) return;
    const promoter = findPromoter(zone.promoters, point.promoter_id);
    if (!promoter) return;
    const otherPointsFromPromoter = zone.points.filter(
      (p) => p.promoter_id === promoter.id && p.id !== point.id
    );
    setSelection({ zoneId, point, promoter, initialTab, otherPointsFromPromoter });
  }

  function handleSelectSearchResult(result: SearchResult) {
    const zone = edition.zones.find((z) =>
      result.kind === "projet"
        ? z.points.some((p) => p.id === result.point.id)
        : z.promoters.some((p) => p.id === result.promoter.id)
    );
    if (!zone) return;

    const targetPoint = result.kind === "projet" ? result.point : result.primaryPoint;
    selectPoint(zone.zone_id, targetPoint, result.kind === "projet" ? "projet" : "promoteur");
  }

  return (
    <div className="absolute inset-0 h-full w-full">
      {/* Couche 0 */}
      <Map center={[primaryZone.zone_center.lng, primaryZone.zone_center.lat]} zoom={12}>
        <AllPoints
          points={allPoints}
          onSelect={(point) => {
            const zoneId = zoneIdByPointId[point.id];
            if (zoneId) selectPoint(zoneId, point);
          }}
        />

        {/* Couche 1 — contrôles flottants */}
        <MapControls className="absolute bottom-6 right-4 z-10" />
        <StatusLegend className="absolute bottom-6 left-4 z-10 md:bottom-6" />
        <SheetPadder selection={selection} />
      </Map>

      <SearchBar zones={edition.zones} onSelect={handleSelectSearchResult} />

      {/* Couche 2 — panneau de détail (Vaul) */}
      <DetailPanel
        point={selection?.point ?? null}
        promoter={selection?.promoter ?? null}
        otherPointsFromPromoter={selection?.otherPointsFromPromoter ?? []}
        initialTab={selection?.initialTab}
        onClose={() => setSelection(null)}
        onSelectOtherPoint={(point) => selection && selectPoint(selection.zoneId, point, "projet")}
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

function AllPoints({
  points,
  onSelect
}: {
  points: Point[];
  onSelect: (point: Point) => void;
}) {
  const { map, zoom } = useMap();
  // Throttle : arrondir le zoom à l'entier le plus proche avant de filtrer,
  // pour éviter des re-renders excessifs pendant un pincement continu.
  const roundedZoom = Math.round(zoom);

  const visiblePoints = useMemo(
    () => points.filter((p) => roundedZoom >= p.zoom_min_marker),
    [points, roundedZoom]
  );

  // GARDE-FOU : au-delà de quelques dizaines de points visibles simultanément,
  // des marqueurs individuels deviennent une "confetti" illisible — on
  // regroupe alors par proximité. Le seuil (36) est volontairement bas :
  // mieux vaut regrouper un peu trop tôt qu'avoir un fouillis visuel.
  const clusters = useMemo(
    () => (visiblePoints.length > 36 ? clusterPoints(visiblePoints, roundedZoom) : null),
    [visiblePoints, roundedZoom]
  );

  if (clusters) {
    return (
      <>
        {clusters.map((cluster) =>
          cluster.points.length === 1 ? (
            <SinglePoint
              key={cluster.points[0].id}
              point={cluster.points[0]}
              showLabel={roundedZoom >= cluster.points[0].zoom_min_label}
              onSelect={onSelect}
            />
          ) : (
            <ClusterBubble
              key={cluster.id}
              cluster={cluster}
              onZoomIn={() => {
                if (!map) return;
                const lats = cluster.points.map((p) => p.coordinates.lat);
                const lngs = cluster.points.map((p) => p.coordinates.lng);
                map.fitBounds(
                  [
                    [Math.min(...lngs), Math.min(...lats)],
                    [Math.max(...lngs), Math.max(...lats)]
                  ],
                  { padding: 80, duration: 400, maxZoom: 17 }
                );
              }}
            />
          )
        )}
      </>
    );
  }

  return (
    <>
      {visiblePoints.map((point) => (
        <SinglePoint
          key={point.id}
          point={point}
          showLabel={roundedZoom >= point.zoom_min_label}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function SinglePoint({
  point,
  showLabel,
  onSelect
}: {
  point: Point;
  showLabel: boolean;
  onSelect: (point: Point) => void;
}) {
  return (
    <MapMarker longitude={point.coordinates.lng} latitude={point.coordinates.lat}>
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
              STATUS_SOLID_CLASS[point.status]
            )}
          />
          <MarkerTooltip>{point.name}</MarkerTooltip>
        </div>
      </MarkerContent>
      {showLabel && <MarkerLabel position="bottom">{point.name}</MarkerLabel>}
    </MapMarker>
  );
}

function ClusterBubble({
  cluster,
  onZoomIn
}: {
  cluster: ReturnType<typeof clusterPoints>[number];
  onZoomIn: () => void;
}) {
  return (
    <MapMarker longitude={cluster.center.lng} latitude={cluster.center.lat}>
      <MarkerContent>
        <button
          type="button"
          onClick={onZoomIn}
          aria-label={`${cluster.points.length} projets à cet endroit, zoomer pour les voir`}
          className={cn(
            "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white shadow-lg transition-transform hover:scale-105",
            STATUS_SOLID_CLASS[cluster.worstStatus]
          )}
        >
          {cluster.points.length}
        </button>
      </MarkerContent>
    </MapMarker>
  );
}