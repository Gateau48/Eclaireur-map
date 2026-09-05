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
      // Prédiction de landing basée sur la vélocité et l'offset
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

      // Animer vers le snap (framer-motion spring fait la transition)
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

          {/* Panel container */}
          <motion.div
            key="panel-root"
            ref={containerRef}
            className={cn(
              "fixed z-50 flex flex-col outline-none",
              direction === "bottom"
                ? "inset-x-0 bottom-0"
                : "inset-y-0 bottom-0 right-0 h-full w-[480px] border-l border-neutral-200",
              className
            )}
            style={{
              ...cssVars,
              ...style,
              borderRadius: direction === "bottom" ? "var(--panel-border-radius) var(--panel-border-radius) 0 0" : undefined,
              height: isDesktop ? "100%" : "var(--panel-height)",
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

            {/* Scrollable content — opacité animée via CSS var */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto scroll-hidden"
              style={{
                touchAction: "pan-y",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
                opacity: cssVars["--panel-content-opacity" as keyof typeof cssVars] as number,
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
