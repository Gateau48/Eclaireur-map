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
import { type PanelView, findProjectAndPromoter, findPromoterById } from "@/lib/panelview";
import { PHASE_SOLID_CLASS } from "@/lib/status";
import { clusterItems, type Cluster, type Clusterable } from "@/lib/clustering";
import type { EditionData, Project, Promoter } from "@/lib/schema";
import { cn } from "@/lib/utils";

interface MapProject extends Clusterable {
  project: Project;
  promoter: Promoter;
}

export function CarteClient({ editionData }: { editionData: EditionData }) {
  const [panelHistory, setPanelHistory] = useState<PanelView[]>([]);

  useEffect(() => {
    document.body.classList.add("map-route");
    return () => document.body.classList.remove("map-route");
  }, []);

  const currentView: PanelView | null = panelHistory.length > 0 ? panelHistory[panelHistory.length - 1] : null;
  const canGoBack = panelHistory.length > 1;

  function openProject(projectId: string) {
    const result = findProjectAndPromoter(editionData, projectId);
    if (!result) return;
    setPanelHistory((h) => [...h, { type: "project", project: result.project, promoter: result.promoter }]);
  }

  function openPromoter(promoterId: string) {
    const promoter = findPromoterById(editionData, promoterId);
    if (!promoter) return;
    setPanelHistory((h) => [...h, { type: "promoter", promoter }]);
  }

  function handleBack() {
    setPanelHistory((h) => h.slice(0, -1));
  }

  function handleClose() {
    setPanelHistory([]);
  }

  const allMapProjects: MapProject[] = useMemo(() => {
    return editionData.promoters.flatMap((promoter) =>
      promoter.projects
        .filter((p) => p.location.latitude !== null && p.location.longitude !== null)
        .map((project) => ({
          id: project.id,
          coordinates: { lat: project.location.latitude!, lng: project.location.longitude! },
          project,
          promoter
        }))
    );
  }, [editionData]);

  const defaultCenter: [number, number] = useMemo(() => {
    if (allMapProjects.length === 0) return [-17.444, 14.693]; // Dakar fallback
    const avgLat = allMapProjects.reduce((s, p) => s + p.coordinates.lat, 0) / allMapProjects.length;
    const avgLng = allMapProjects.reduce((s, p) => s + p.coordinates.lng, 0) / allMapProjects.length;
    return [avgLng, avgLat];
  }, [allMapProjects]);

  function handleSelectSearchResult(result: SearchResult) {
    if (result.kind === "projet") {
      openProject(result.project.id);
    } else {
      openPromoter(result.promoter.id);
    }
  }

  return (
    <div className="absolute inset-0 h-full w-full">
      <Map center={defaultCenter} zoom={12}>
        <AllProjects
          projects={allMapProjects}
          onSelect={(mp) => openProject(mp.project.id)}
        />

        <MapControls className="absolute bottom-6 right-4 z-10" />
        <StatusLegend className="absolute bottom-6 left-4 z-10 md:bottom-6" />
        <SheetPadder currentView={currentView} />
      </Map>

      <SearchBar edition={editionData} onSelect={handleSelectSearchResult} />

      <DetailPanel
        view={currentView}
        canGoBack={canGoBack}
        onClose={handleClose}
        onBack={handleBack}
        onOpenProject={openProject}
        onOpenPromoter={openPromoter}
      />
    </div>
  );
}

const sheetHeightListeners = new Set<(heightPx: number) => void>();

function SheetPadder({ currentView }: { currentView: PanelView | null }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map) return;
    const listener = (heightPx: number) => {
      map.easeTo({ padding: { bottom: heightPx, top: 0, left: 0, right: 0 }, duration: 300 });
    };
    sheetHeightListeners.add(listener);
    return () => { sheetHeightListeners.delete(listener); };
  }, [map]);

  useEffect(() => {
    if (!map || !currentView) return;
    if (currentView.type === "project") {
      const loc = currentView.project.location;
      if (loc.latitude !== null && loc.longitude !== null) {
        map.easeTo({ center: [loc.longitude, loc.latitude], duration: 300 });
      }
    }
  }, [map, currentView]);

  return null;
}

function AllProjects({
  projects,
  onSelect
}: {
  projects: MapProject[];
  onSelect: (mp: MapProject) => void;
}) {
  const { map, zoom } = useMap();
  const roundedZoom = Math.round(zoom);

  const clusters: Cluster<MapProject>[] | null = useMemo(
    () => (projects.length > 36 ? clusterItems(projects, roundedZoom) : null),
    [projects, roundedZoom]
  );

  if (clusters) {
    return (
      <>
        {clusters.map((cluster) =>
          cluster.items.length === 1 ? (
            <SingleProject
              key={cluster.items[0].id}
              mp={cluster.items[0]}
              onSelect={onSelect}
            />
          ) : (
            <ClusterBubble
              key={cluster.id}
              cluster={cluster}
              onZoomIn={() => {
                if (!map) return;
                const lats = cluster.items.map((p) => p.coordinates.lat);
                const lngs = cluster.items.map((p) => p.coordinates.lng);
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
      {projects.map((mp) => (
        <SingleProject key={mp.id} mp={mp} onSelect={onSelect} />
      ))}
    </>
  );
}

function SingleProject({
  mp,
  onSelect
}: {
  mp: MapProject;
  onSelect: (mp: MapProject) => void;
}) {
  const phase = mp.project.status?.phase ?? "inconnu";
  return (
    <MapMarker longitude={mp.coordinates.lng} latitude={mp.coordinates.lat}>
      <MarkerContent>
        <div className="group relative">
          <div
            onClick={() => onSelect(mp)}
            role="button"
            tabIndex={0}
            aria-label={mp.project.name}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(mp);
            }}
            className={cn(
              "size-4 cursor-pointer rounded-full border-2 border-white shadow-lg transition-transform hover:scale-110",
              PHASE_SOLID_CLASS[phase]
            )}
          />
          <MarkerTooltip>{mp.project.name}</MarkerTooltip>
        </div>
      </MarkerContent>
      <MarkerLabel position="bottom">{mp.project.name}</MarkerLabel>
    </MapMarker>
  );
}

function ClusterBubble({
  cluster,
  onZoomIn
}: {
  cluster: Cluster<MapProject>;
  onZoomIn: () => void;
}) {
  return (
    <MapMarker longitude={cluster.center.lng} latitude={cluster.center.lat}>
      <MarkerContent>
        <button
          type="button"
          onClick={onZoomIn}
          aria-label={`${cluster.items.length} projets à cet endroit, zoomer pour les voir`}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-neutral-600 text-xs font-semibold text-white shadow-lg transition-transform hover:scale-105"
        >
          {cluster.items.length}
        </button>
      </MarkerContent>
    </MapMarker>
  );
}
