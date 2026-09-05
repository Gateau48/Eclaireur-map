"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "motion/react";
import { usePanelAnimation } from "@/hooks/usePanelAnimation";
import { cn } from "@/lib/utils";

const SPRING_CONFIG = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface PanelRootProps {
  open: boolean;
  onClose: () => void;
  onSnapChange?: (snap: number | string | null) => void;
  onScroll?: (scrollTop: number) => void;
  direction?: "bottom" | "right";
  snapPoints?: readonly number[];
  blocking?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function PanelRoot({
  open,
  onClose,
  onSnapChange,
  onScroll,
  direction = "bottom",
  snapPoints = [0.5, 0.92],
  blocking = true,
  children,
  className,
  style,
}: PanelRootProps) {
  const {
    containerRef,
    headerRef,
    targetHeight,
    setTargetHeight,
    cssVars,
    findSnap,
    minSnap,
    maxSnap,
    lastSnapRef,
  } = usePanelAnimation({
    open,
    snapPointsPercent: snapPoints,
    direction,
    onClose,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Hauteur animée : commence à 0 quand le panel s'ouvre, puis anime vers targetHeight
  const [animatedHeight, setAnimatedHeight] = useState(0);

  // Forcer le départ à 0 quand le panel s'ouvre
  useEffect(() => {
    if (open) {
      // Premier render : hauteur à 0 (pour que la CSS transition anime de 0 → target)
      setAnimatedHeight(0);
      // Après un frame, définir la hauteur cible (la CSS transition fera le reste)
      const raf = requestAnimationFrame(() => {
        setAnimatedHeight(targetHeight);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setAnimatedHeight(0);
    }
  }, [open]); // Pas de dependency sur targetHeight ici — on veut juste le départ à 0

  // Mettre à jour la hauteur animée quand targetHeight change (snap change)
  useEffect(() => {
    if (open && animatedHeight > 0) {
      setAnimatedHeight(targetHeight);
    }
  }, [targetHeight, open]);

  // Content opacity : fade-in avec delay pour synchroniser avec le slide-up
  const [contentVisible, setContentVisible] = useState(false);
  useEffect(() => {
    if (open) {
      // Delay de 150ms pour laisser le slide commencer avant le fade-in
      const timer = setTimeout(() => setContentVisible(true), 150);
      return () => clearTimeout(timer);
    } else {
      setContentVisible(false);
    }
  }, [open]);

  // --- Focus trap ---
  useEffect(() => {
    if (!open || !blocking) return;
    const previouslyFocused = document.activeElement as HTMLElement;
    return () => {
      previouslyFocused?.focus();
    };
  }, [open, blocking]);

  // --- Body scroll lock ---
  useEffect(() => {
    if (!open || !blocking) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open, blocking]);

  // --- Handle drag end : trouver le snap le plus proche ---
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const velocity = isDesktop ? info.velocity.x : info.velocity.y;
      const offset = isDesktop ? info.offset.x : info.offset.y;

      // Si le user a swipé suffisamment vers l'extérieur → fermer
      const isDismiss =
        (direction === "bottom" && info.offset.y > minSnap * 0.4 && info.velocity.y > 0) ||
        (direction === "right" && info.offset.x > minSnap * 0.4 && info.velocity.x > 0);

      if (isDismiss) {
        onClose();
        return;
      }

      // Calculer la position prédite et trouver le snap le plus proche
      const predicted = targetHeight + velocity * 0.3 + offset * 0.1;
      const snapped = findSnap(predicted);

      setTargetHeight(snapped);
      lastSnapRef.current = snapped;
      onSnapChange?.(snapped);
    },
    [
      targetHeight,
      findSnap,
      onClose,
      direction,
      isDesktop,
      minSnap,
      setTargetHeight,
      onSnapChange,
      lastSnapRef,
    ]
  );

  // --- Drag constraints ---
  const dragConstraints = isDesktop
    ? { left: -maxSnap * 0.5, right: 0, top: 0, bottom: 0 }
    : { top: -maxSnap * 0.5, bottom: 0, left: 0, right: 0 };

  // Hauteur finale : 0 quand fermé, animatedHeight quand ouvert
  const panelHeight = open ? animatedHeight : 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          {blocking && (
            <motion.div
              key="panel-backdrop"
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
          )}

          {/* Panel container — data-panel-root pour les CSS transitions */}
          <motion.div
            key="panel-root"
            ref={containerRef}
            data-panel-root
            className={cn(
              "fixed z-50 flex flex-col outline-none overflow-hidden",
              direction === "bottom"
                ? "inset-x-0 bottom-0"
                : "inset-y-0 bottom-0 right-0 h-full w-[480px] border-l border-neutral-200",
              className
            )}
            style={{
              ...cssVars,
              ...style,
              borderRadius: direction === "bottom"
                ? "var(--panel-border-radius) var(--panel-border-radius) 0 0"
                : undefined,
              height: isDesktop ? "100%" : `${panelHeight}px`,
            }}
            initial={
              direction === "bottom"
                ? { y: "100%", opacity: 0 }
                : { x: "100%", opacity: 0 }
            }
            animate={
              direction === "bottom"
                ? { y: 0, opacity: 1 }
                : { x: 0, opacity: 1 }
            }
            exit={
              direction === "bottom"
                ? { y: "100%", opacity: 0 }
                : { x: "100%", opacity: 0 }
            }
            transition={SPRING_CONFIG}
            drag={direction === "bottom" ? "y" : "x"}
            dragDirectionLock
            dragConstraints={dragConstraints}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
          >
            {/* Handle bar (mobile uniquement) */}
            {direction === "bottom" && (
              <div
                ref={headerRef}
                className="flex shrink-0 cursor-grab items-center justify-center px-4 pb-1 pt-2 active:cursor-grabbing md:hidden"
              >
                <div className="h-1 w-9 rounded-full bg-neutral-300" />
              </div>
            )}

            {/* Scrollable content — fade-in avec delay via data-panel-scroll */}
            <div
              ref={scrollRef}
              data-panel-scroll
              className="flex-1 overflow-y-auto scroll-hidden"
              style={{
                touchAction: "pan-y",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
                opacity: contentVisible ? 1 : 0,
              }}
              onScroll={(e) => {
                onScroll?.(e.currentTarget.scrollTop);
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
