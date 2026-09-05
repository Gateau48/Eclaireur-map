"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface SnapPointConfig {
  min: number;
  max: number;
  default: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Hook inspiré de react-spring-bottom-sheet qui gère :
 * - Le calcul des snap points en pixels
 * - L'interpolation spring pour les CSS custom properties
 * - Le rubber band effect au drag
 * - Le lastSnap (mémoire de la dernière position)
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
  const [currentHeight, setCurrentHeight] = useState(0);
  const [targetHeight, setTargetHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
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
      setCurrentHeight(defaultSnap);
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

  // Enregistrer le snap actuel quand l'animation se termine
  useEffect(() => {
    if (!isDragging) {
      lastSnapRef.current = targetHeight;
    }
  }, [targetHeight, isDragging]);

  // Calculer les interpolations CSS (inspiré de useSpringInterpolations)
  const cssVars = useMemo(() => {
    const effectiveHeight = isDragging
      ? clamp(currentHeight + dragY, minSnap * 0.3, maxSnap * 1.15)
      : currentHeight;

    // Border radius: diminue quand le panneau grandit
    const maxHeight = maxSnap;
    const borderRadius = clamp(maxHeight - effectiveHeight, 0, 16);

    // Content opacity: fade-in pendant l'ouverture
    const minX = Math.max(minSnap / 2 - 45, 0);
    const maxX = Math.min(minSnap / 2 + 45, minSnap);
    const slope = 1 / (maxX - minX);
    const contentOpacity = clamp((effectiveHeight - minX) * slope, 0, 1);

    // Backdrop opacity: proportionnelle à la hauteur
    const backdropOpacity = minSnap ? clamp(effectiveHeight / minSnap, 0, 0.6) : 0;

    // Translate Y pour rubber band
    let translateY = 0;
    if (effectiveHeight < minSnap) {
      translateY = minSnap - effectiveHeight;
    } else if (effectiveHeight > maxSnap) {
      translateY = maxSnap - effectiveHeight;
    }

    // Hauteur finale (clampée aux bounds)
    const finalHeight = clamp(effectiveHeight, minSnap, maxSnap);

    return {
      "--panel-height": `${finalHeight}px`,
      "--panel-border-radius": `${borderRadius}px`,
      "--panel-content-opacity": contentOpacity,
      "--panel-backdrop-opacity": backdropOpacity,
      "--panel-translate-y": `${translateY}px`,
    } as React.CSSProperties;
  }, [currentHeight, dragY, isDragging, minSnap, maxSnap]);

  return {
    containerRef,
    headerRef,
    currentHeight,
    targetHeight,
    isDragging,
    setIsDragging,
    setTargetHeight,
    setCurrentHeight,
    dragY,
    setDragY,
    cssVars,
    findSnap,
    snapPointsPx,
    minSnap,
    maxSnap,
    defaultSnap,
    lastSnapRef,
  };
}
