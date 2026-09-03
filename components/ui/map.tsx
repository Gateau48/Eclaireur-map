"use client";

/**
 * Implémentation façon "mapcn" (composants de carte shadcn/ui sur MapLibre GL).
 *
 * NOTE POUR L'AGENT DE CODE : le brief demande d'installer la vraie librairie
 * via `npx shadcn@latest add @mapcn/map`, ce qui écrasera/complètera ce
 * fichier avec l'implémentation officielle (déjà stylée, dark/light auto).
 * Ce fichier est une implémentation de secours qui respecte exactement la
 * même API (Map, MapControls, MapMarker, MarkerContent, MarkerPopup,
 * MarkerTooltip, MarkerLabel, useMap) afin que le reste du projet
 * (app/[edition]/CarteClient.tsx, etc.) fonctionne sans modification une
 * fois la vraie librairie installée à la place.
 */

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const DEFAULT_LIGHT_STYLE = "https://tiles.openfreemap.org/styles/positron";
const DEFAULT_DARK_STYLE = "https://tiles.openfreemap.org/styles/dark-matter";

interface MapContextValue {
  map: MapLibreMap | null;
  zoom: number;
}

const MapContext = createContext<MapContextValue>({ map: null, zoom: 12 });

export function useMap() {
  return useContext(MapContext);
}

export interface MapProps {
  center: [number, number];
  zoom: number;
  styles?: string;
  children?: ReactNode;
  className?: string;
  cooperativeGestures?: boolean;
}

export function Map({
  center,
  zoom,
  styles,
  children,
  className,
  // GARDE-FOU : cooperativeGestures force "il faut deux doigts pour
  // déplacer la carte" (avec un message à l'écran) — c'est pensé pour une
  // carte intégrée dans une page qui défile, afin de ne pas capturer le
  // scroll de la page par erreur. Notre carte est plein écran (jamais de
  // scroll de page sur cette route, voir CarteClient.tsx), donc un seul
  // doigt doit suffire pour naviguer, comme Google Maps.
  cooperativeGestures = false
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [, setMounted] = useState(false); // force re-render une fois la carte prête
  const [zoomState, setZoomState] = useState(zoom);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Fond CARTO gratuit sans clé API, adapté automatiquement dark/clair
    // — sauf si `styles` est fourni explicitement (voir Partie 4 du brief).
    const styleUrl = styles ?? (isDark ? DEFAULT_DARK_STYLE : DEFAULT_LIGHT_STYLE);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center,
      zoom,
      cooperativeGestures,
      attributionControl: { compact: true }
    });

    // Rotation désactivée volontairement — carte toujours orientée nord
    // (Partie 4 du brief, table "Règles de gestes").
    map.touchZoomRotate.disableRotation();
    map.dragRotate.disable();

    const onZoom = () => setZoomState(map.getZoom());
    map.on("zoom", onZoom);
    map.on("load", () => setMounted(true));

    mapRef.current = map;

    return () => {
      map.off("zoom", onZoom);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-thème si le mode change et qu'aucun style custom n'est fourni.
  useEffect(() => {
    if (!mapRef.current || styles) return;
    mapRef.current.setStyle(isDark ? DEFAULT_DARK_STYLE : DEFAULT_LIGHT_STYLE);
  }, [isDark, styles]);

  return (
    <MapContext.Provider value={{ map: mapRef.current, zoom: zoomState }}>
      {/* Couche 0 — le canevas carte remplit tout l'écran, ne bouge jamais
          dans le flux du document. Le parent doit avoir une hauteur
          explicite (voir garde-fous d'initialisation, Partie 4). */}
      <div ref={containerRef} className={cn("absolute inset-0 h-full w-full", className)} />
      {mapRef.current && children}
    </MapContext.Provider>
  );
}

export function MapControls({
  className,
  position = "bottom-right"
}: {
  className?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}) {
  const { map } = useMap();
  if (!map) return null;

  return (
    <div
      className={cn(
        "glass flex flex-col overflow-hidden rounded-2xl",
        className
      )}
      role="group"
      aria-label="Contrôles de zoom"
    >
      <button
        type="button"
        onClick={() => map.zoomIn()}
        aria-label="Zoomer"
        className="flex h-11 w-11 items-center justify-center text-lg font-medium hover:bg-black/5 dark:hover:bg-white/10 md:h-9 md:w-9"
      >
        +
      </button>
      <div className="h-px w-full bg-black/10 dark:bg-white/10" />
      <button
        type="button"
        onClick={() => map.zoomOut()}
        aria-label="Dézoomer"
        className="flex h-11 w-11 items-center justify-center text-lg font-medium hover:bg-black/5 dark:hover:bg-white/10 md:h-9 md:w-9"
      >
        −
      </button>
    </div>
  );
}

export interface MapMarkerProps {
  longitude: number;
  latitude: number;
  children?: ReactNode;
}

/**
 * Marqueur basé sur le DOM (maplibregl.Marker + portail React).
 * GARDE-FOU DE PERFORMANCE : convient jusqu'à quelques centaines de
 * marqueurs. Au-delà de plusieurs milliers de points, passer à une source
 * GeoJSON + layer (voir doc mapcn "Advanced/GeoJSON").
 */
export function MapMarker({ longitude, latitude, children }: MapMarkerProps) {
  const { map } = useMap();
  const elRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!map) return;
    const el = document.createElement("div");
    elRef.current = el;
    const marker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([longitude, latitude])
      .addTo(map);
    markerRef.current = marker;
    forceRender((n) => n + 1);

    return () => {
      marker.remove();
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude]);
  }, [longitude, latitude]);

  if (!elRef.current) return null;
  return createPortal(children, elRef.current);
}

export function MarkerContent({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function MarkerTooltip({ children }: { children: ReactNode }) {
  return (
    <div
      className="glass pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2
        whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium opacity-0
        transition-opacity duration-150 group-hover:opacity-100"
    >
      {children}
    </div>
  );
}

export function MarkerLabel({
  children,
  position = "bottom"
}: {
  children: ReactNode;
  position?: "bottom" | "top";
}) {
  return null;
}

/** Non utilisé pour le détail (voir Partie 2.1 du brief) — fourni pour
 *  compatibilité d'API avec mapcn uniquement. */
export function MarkerPopup({ children }: { children: ReactNode }) {
  return <>{children}</>;
}