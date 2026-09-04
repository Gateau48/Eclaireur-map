"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerTooltip,
  useMap
} from "@/components/ui/map";
import { SearchBar } from "@/components/SearchBar";
import { MapLegend } from "@/components/MapLegend";
import type { SearchApiResult } from "@/app/api/search/[edition]/route";
import { DetailPanel, PANEL_SNAP_POINTS } from "@/components/DetailPanel";
import { clusterItems, type Clusterable } from "@/lib/clustering";
import { findProjectAndPromoter, findPromoterById, type PanelView } from "@/lib/panel-view";
import { PHASE_MARKER_COLOR } from "@/lib/status";
import { PROJECT_PHASE_LABELS, type EditionData, type Project } from "@/lib/schema";
import { cn } from "@/lib/utils";

interface MarkerPoint extends Clusterable {
  project: Project;
}

export function CarteClient({ edition }: { edition: EditionData }) {
  const [stack, setStack] = useState<PanelView[]>([]);
  const [snap, setSnap] = useState<number | string | null>(PANEL_SNAP_POINTS[1]);
  const view = stack[stack.length - 1] ?? null;

  // La carte gère son propre déplacement via ses gestes — pas de scroll de
  // page sur cette route.
  useEffect(() => {
    document.body.classList.add("map-route");
    return () => document.body.classList.remove("map-route");
  }, []);

  // Seuls les projets à localisation "exact" reçoivent un marqueur — voir
  // règle produit : jamais de coordonnées devinées sur la carte (Partie 4).
  const markerPoints = useMemo<MarkerPoint[]>(() => {
    const points: MarkerPoint[] = [];
    for (const promoter of edition.promoters) {
      for (const project of promoter.projects) {
        const { latitude, longitude, precision } = project.location;
        if (precision === "exact" && latitude !== null && longitude !== null) {
          points.push({ id: project.id, coordinates: { lat: latitude, lng: longitude }, project });
        }
      }
    }
    return points;
  }, [edition]);

  const defaultCenter = useMemo<[number, number]>(() => {
    if (markerPoints.length === 0) return [-17.4677, 14.7167]; // Dakar par défaut
    return [
      markerPoints.reduce((s, p) => s + p.coordinates.lng, 0) / markerPoints.length,
      markerPoints.reduce((s, p) => s + p.coordinates.lat, 0) / markerPoints.length
    ];
  }, [markerPoints]);

  function openProject(projectId: string, resetStack = true) {
    const found = findProjectAndPromoter(edition, projectId);
    if (!found) return;
    const nextView: PanelView = { type: "project", ...found };
    setStack(resetStack ? [nextView] : (s) => [...s, nextView]);
    setSnap(PANEL_SNAP_POINTS[1]);
  }

  function goBack() {
    setStack((s) => s.slice(0, -1));
  }

  function handleSelectSearchResult(result: SearchApiResult) {
    if (result.kind === "project" && result.projectId) {
      openProject(result.projectId);
    } else {
      const promoter = findPromoterById(edition, result.promoterId);
      if (!promoter) return;
      const nextView: PanelView = { type: "promoter", promoter };
      setStack([nextView]);
      setSnap(PANEL_SNAP_POINTS[1]);
    }
  }

  return (
    <div className="absolute inset-0 h-full w-full">
      <Map center={defaultCenter} zoom={12}>
        <MarkerLayer points={markerPoints} onSelect={(id) => openProject(id)} />
        <MapSync view={view} snap={snap} />
      </Map>

      <MapLegend className="absolute bottom-6 right-4 z-10" />

      <SearchBar
        editionId={edition.edition_id}
        onSelect={handleSelectSearchResult}
        hidden={!!view}
        panelOpen={!!view}
      />

      <DetailPanel
        view={view}
        canGoBack={stack.length > 1}
        snap={snap}
        onSnapChange={setSnap}
        onClose={() => setStack([])}
        onBack={goBack}
        onOpenProject={(id) => openProject(id, true)}
      />
    </div>
  );
}

/** Recentre la carte sur le projet sélectionné (si coordonnées connues) et
 *  ajuste le padding en fonction du snap point courant du panneau, pour
 *  garder le point visible au-dessus. */
function MapSync({ view, snap }: { view: PanelView | null; snap: number | string | null }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map) return;
    const heightPx = typeof snap === "number" ? Math.round(snap * window.innerHeight) : 96;
    map.easeTo({ padding: { bottom: heightPx, top: 0, left: 0, right: 0 }, duration: 300 });
  }, [map, snap]);

  useEffect(() => {
    if (!map || view?.type !== "project") return;
    const { latitude, longitude, precision } = view.project.location;
    if (precision === "exact" && latitude !== null && longitude !== null) {
      map.easeTo({ center: [longitude, latitude], duration: 300 });
    }
  }, [map, view]);

  return null;
}

function MarkerLayer({ points, onSelect }: { points: MarkerPoint[]; onSelect: (projectId: string) => void }) {
  const { zoom } = useMap();
  const roundedZoom = Math.round(zoom);

  // GARDE-FOU : au-delà de quelques dizaines de marqueurs visibles
  // simultanément, on regroupe par proximité plutôt que de laisser une
  // "confetti" illisible — le cluster affiche un nombre, jamais une
  // couleur (plus de statut à agréger, voir discussion produit).
  const clusters = useMemo(
    () => (points.length > 36 ? clusterItems(points, roundedZoom) : null),
    [points, roundedZoom]
  );

  if (clusters) {
    return (
      <>
        {clusters.map((cluster) =>
          cluster.items.length === 1 ? (
            <SingleMarker key={cluster.items[0].id} point={cluster.items[0]} onSelect={onSelect} />
          ) : (
            <ClusterBubble key={cluster.id} count={cluster.items.length} center={cluster.center} points={cluster.items} />
          )
        )}
      </>
    );
  }

  return (
    <>
      {points.map((point) => (
        <SingleMarker key={point.id} point={point} onSelect={onSelect} />
      ))}
    </>
  );
}

const PHASE_TEXT_COLOR: Record<string, string> = {
  annonce: "text-sky-600",
  commercialisation: "text-emerald-600",
  en_construction: "text-amber-600",
  livre: "text-neutral-600",
  suspendu: "text-red-600",
  inconnu: "text-neutral-400"
};

function SingleMarker({ point, onSelect }: { point: MarkerPoint; onSelect: (projectId: string) => void }) {
  const phase = point.project.status?.phase ?? "inconnu";
  const colorClass = PHASE_MARKER_COLOR[phase];
  const textColor = PHASE_TEXT_COLOR[phase] ?? "text-neutral-500";

  return (
    <MapMarker longitude={point.coordinates.lng} latitude={point.coordinates.lat}>
      <MarkerContent>
        <div className="group relative flex flex-col items-center">
          <button
            type="button"
            onClick={() => onSelect(point.id)}
            aria-label={point.project.name}
            className={cn(
              "flex h-3 w-3 items-center justify-center rounded-full shadow-sm",
              "transition-transform hover:scale-125",
              colorClass
            )}
          />
          <MarkerLabel className={textColor}>{point.project.name}</MarkerLabel>
          <MarkerTooltip>{point.project.name}</MarkerTooltip>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

function ClusterBubble({
  count,
  center,
  points
}: {
  count: number;
  center: { lat: number; lng: number };
  points: MarkerPoint[];
}) {
  const { map } = useMap();
  return (
    <MapMarker longitude={center.lng} latitude={center.lat}>
      <MarkerContent>
        <button
          type="button"
          onClick={() => {
            if (!map) return;
            const lats = points.map((p) => p.coordinates.lat);
            const lngs = points.map((p) => p.coordinates.lng);
            map.fitBounds(
              [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)]
              ],
              { padding: 80, duration: 400, maxZoom: 17 }
            );
          }}
          aria-label={`${count} projets à cet endroit, zoomer pour les voir`}
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-teal-600 text-xs font-semibold text-white shadow-md transition-transform hover:scale-105"
        >
          {count}
        </button>
      </MarkerContent>
    </MapMarker>
  );
}