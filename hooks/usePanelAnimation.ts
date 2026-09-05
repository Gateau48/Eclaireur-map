"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Hook inspiré de react-spring-bottom-sheet qui gère :
 * - Le calcul des snap points en pixels
 * - Les interpolations CSS (border radius, content opacity, backdrop opacity)
 * - Le lastSnap (mémoire de la dernière position)
 *
 * Le drag visuel est géré par framer-motion (x/y transform).
 * Ce hook fournit les CSS custom properties pour les effets visuels
 * et calcule le snap point cible après un drag.
 */
export function usePanelAnimation({
  open,
  snapPointsPercent,
  direction,
  onClose,
}: {
  open: boolean;
  snapPointsPercent: readonly number[];
  direction: "bottom" | "right";
  onClose: () => void;
}) {
  const [targetHeight, setTargetHeight] = useState(0);
  const lastSnapRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Calculer les snap points en pixels basés sur la hauteur de la fenêtre
  const snapPointsPx = useMemo(() => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    return snapPointsPercent.map((p) => Math.round(p * vh));
  }, [snapPointsPercent]);

  const minSnap = snapPointsPx[0] ?? 0;
  const maxSnap = snapPointsPx[snapPointsPx.length - 1] ?? 0;

  // Trouver le snap point le plus proche
  const findSnap = useCallback(
    (height: number): number => {
      let closest = minSnap;
      let minDist = Infinity;
      for (const snap of snapPointsPx) {
        const dist = Math.abs(height - snap);
        if (dist < minDist) {
          minDist = dist;
          closest = snap;
        }
      }
      return closest;
    },
    [snapPointsPx, minSnap]
  );

  // Default snap: lastSnap ou le premier point
  const defaultSnap = useMemo(() => {
    if (lastSnapRef.current !== null) {
      return findSnap(lastSnapRef.current);
    }
    return minSnap;
  }, [findSnap, minSnap]);

  // Mettre à jour la hauteur cible quand le panneau s'ouvre
  useEffect(() => {
    if (open) {
      setTargetHeight(defaultSnap);
    } else {
      setTargetHeight(0);
    }
  }, [open, defaultSnap]);

  // Écouter les changements de taille de la fenêtre
  useEffect(() => {
    const handleResize = () => {
      if (!open) return;
      const vh = window.innerHeight;
      const newTarget = clamp(targetHeight, 0, vh * 0.95);
      setTargetHeight(newTarget);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open, targetHeight]);

  // Enregistrer le snap actuel quand la cible change
  useEffect(() => {
    if (targetHeight > 0) {
      lastSnapRef.current = targetHeight;
    }
  }, [targetHeight]);

  // Calculer les interpolations CSS basées sur targetHeight
  // Ces variables sont utilisées pour les effets visuels (opacity, border radius)
  // pendant que framer-motion gère le drag x/y
  const cssVars = useMemo(() => {
    // Border radius: diminue quand le panneau grandit (16px → 0px)
    const borderRadius = clamp(maxSnap - targetHeight, 0, 16);

    // Content opacity: fade-in pendant l'ouverture (0 → 1)
    // Le contenu devient visible quand le panneau dépasse la moitié du minSnap
    const minX = Math.max(minSnap / 2 - 45, 0);
    const maxX = Math.min(minSnap / 2 + 45, minSnap);
    const slope = 1 / (maxX - minX);
    const contentOpacity = clamp((targetHeight - minX) * slope, 0, 1);

    // Backdrop opacity: proportionnelle à la hauteur (0 → 0.6)
    const backdropOpacity = minSnap ? clamp(targetHeight / minSnap, 0, 0.6) : 0;

    return {
      "--panel-height": `${targetHeight}px`,
      "--panel-border-radius": `${borderRadius}px`,
      "--panel-content-opacity": contentOpacity,
      "--panel-backdrop-opacity": backdropOpacity,
    } as React.CSSProperties;
  }, [targetHeight, minSnap, maxSnap]);

  return {
    containerRef,
    headerRef,
    targetHeight,
    setTargetHeight,
    cssVars,
    findSnap,
    snapPointsPx,
    minSnap,
    maxSnap,
    defaultSnap,
    lastSnapRef,
  };
}
