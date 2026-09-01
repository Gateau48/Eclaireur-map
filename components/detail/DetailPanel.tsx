"use client";

import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { ExternalLink, Gavel, Landmark, Newspaper, X } from "lucide-react";
import { cn, formatLastVerified } from "@/lib/utils";
import {
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  type Point,
  type Source
} from "@/lib/data/schema";

const SOURCE_ICONS: Record<Source["type"], typeof Newspaper> = {
  presse: Newspaper,
  justice: Gavel,
  officiel: Landmark
};

const SNAP_POINTS = [0.15, 0.5, 0.92] as const;

interface DetailPanelProps {
  point: Point | null;
  onClose: () => void;
  /** Appelé à chaque changement de snap point, en pixels de hauteur visible,
   *  pour que la carte ajuste son padding (Partie 4 du brief). */
  onSheetHeightChange: (heightPx: number) => void;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

export function DetailPanel({ point, onClose, onSheetHeightChange }: DetailPanelProps) {
  const isDesktop = useIsDesktop();
  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[1]);

  useEffect(() => {
    if (!point) return;
    setSnap(SNAP_POINTS[1]);
  }, [point]);

  // Synchronise la carte avec le panneau à chaque changement de snap point
  // — pas une seule fois à l'ouverture (Partie 4 du brief).
  useEffect(() => {
    if (isDesktop) {
      onSheetHeightChange(point ? 0 : 0); // desktop : panneau flottant, ne pousse pas le padding vertical
      return;
    }
    const ratio = typeof snap === "number" ? snap : 0;
    onSheetHeightChange(Math.round(ratio * window.innerHeight));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, isDesktop, point]);

  return (
    <Drawer.Root
      open={!!point}
      onOpenChange={(open) => !open && onClose()}
      direction={isDesktop ? "right" : "bottom"}
      snapPoints={isDesktop ? undefined : [...SNAP_POINTS]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      // GARDE-FOU : pas d'overlay sombre, la carte reste visible/interactive
      // derrière — comportement Google Maps, pas un modal classique.
      modal={false}
    >
      <Drawer.Portal>
        <Drawer.Content
          className={cn(
            "glass fixed z-20 flex flex-col outline-none",
            "inset-x-0 bottom-0 h-[92vh] rounded-t-4xl",
            "md:inset-y-4 md:bottom-auto md:right-4 md:left-auto md:h-auto md:max-h-[calc(100vh-2rem)]",
            "md:w-[400px] md:rounded-4xl"
          )}
        >
          <Drawer.Handle className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-neutral-400/60 md:hidden" />

          {point && (
            <div className="flex-1 overflow-y-auto px-6 pb-8 pt-4 md:pt-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <Drawer.Title className="text-xl font-semibold leading-tight">
                  {point.name}
                </Drawer.Title>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fermer le panneau"
                  className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 md:flex"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                  STATUS_BADGE_CLASS[point.status]
                )}
              >
                {STATUS_LABELS[point.status]}
              </span>

              <p className="mt-4 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                {point.summary}
              </p>

              <div className="mt-6">
                <h2 className="mb-2 text-sm font-semibold text-neutral-500">Sources</h2>
                <ul className="space-y-1.5">
                  {point.sources.map((source) => {
                    const Icon = SOURCE_ICONS[source.type];
                    return (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
                          <span className="flex-1 truncate">{source.title}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <p className="mt-6 text-xs text-neutral-500">
                {formatLastVerified(point.last_verified)}
              </p>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
