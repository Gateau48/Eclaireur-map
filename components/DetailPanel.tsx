"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Drawer } from "vaul";
import {
  ArrowUpRight,
  ChevronDown,
  ExternalLink,
  Gavel,
  Home,
  Landmark,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Timer,
  X
} from "lucide-react";
import { cn, formatLastVerified } from "@/lib/utils";
import {
  groupSourcesByCategory,
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  type Point,
  type Promoter,
  type Source
} from "@/lib/schema";

const SOURCE_ICONS: Record<Source["category"], typeof Newspaper> = {
  presse: Newspaper,
  justice: Gavel,
  officiel: Landmark,
  reseaux_sociaux: Sparkles
};

const SNAP_POINTS = [0.15, 0.5, 0.92] as const;
type Tab = "projet" | "promoteur";

interface DetailPanelProps {
  point: Point | null;
  promoter: Promoter | null;
  initialTab?: Tab;
  onClose: () => void;
  /** Appelé à chaque changement de snap point, en pixels de hauteur visible,
   *  pour que la carte ajuste son padding. */
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

export function DetailPanel({
  point,
  promoter,
  initialTab = "projet",
  onClose,
  onSheetHeightChange
}: DetailPanelProps) {
  const isDesktop = useIsDesktop();
  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[1]);
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (!point) return;
    setSnap(SNAP_POINTS[1]);
    setTab(initialTab);
  }, [point, initialTab]);

  // Synchronise la carte avec le panneau à chaque changement de snap point
  // — pas une seule fois à l'ouverture.
  useEffect(() => {
    if (isDesktop) {
      onSheetHeightChange(0); // desktop : panneau flottant, ne pousse pas le padding vertical
      return;
    }
    const ratio = typeof snap === "number" ? snap : 0;
    onSheetHeightChange(Math.round(ratio * window.innerHeight));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, isDesktop, point]);

  if (!point || !promoter) {
    return (
      <Drawer.Root open={false} direction={isDesktop ? "right" : "bottom"}>
        <Drawer.Portal>
          <Drawer.Content />
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

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
            "md:w-[420px] md:rounded-4xl"
          )}
        >
          <Drawer.Handle className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-neutral-400/60 md:hidden" />

          <div className="flex-1 overflow-y-auto px-6 pb-8 pt-4 md:pt-6">
            {/* En-tête : nom + statut selon l'onglet actif */}
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <Drawer.Title className="text-xl font-semibold leading-tight">
                  {tab === "projet" ? point.name : promoter.name}
                </Drawer.Title>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {tab === "projet"
                    ? `Promoteur ${promoter.name}`
                    : `Promoteur · ${promoter.quartier}`}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer le panneau"
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 md:flex"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Badges promoteur — expérience, certification, portefeuille */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-3 py-1.5 text-xs font-medium text-white">
                <Timer className="h-3.5 w-3.5" aria-hidden />
                {promoter.years_experience} ans d&rsquo;expérience
              </span>
              {promoter.certified && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1.5 text-xs font-medium text-sky-800 dark:bg-sky-400/20 dark:text-sky-300">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Certifié
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                <Home className="h-3.5 w-3.5" aria-hidden />
                {promoter.property_count > 1
                  ? `+ de ${promoter.property_count} propriétés`
                  : "1 propriété recensée"}
              </span>
            </div>

            {/* Statut de vérification du projet — toujours visible, quel que
                soit l'onglet, car c'est l'information la plus importante. */}
            <span
              className={cn(
                "mb-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                STATUS_BADGE_CLASS[point.status]
              )}
            >
              {STATUS_LABELS[point.status]} · {point.name}
            </span>

            {/* Deux photos côte à côte : le projet, puis le promoteur */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <PhotoTile src={point.project_photo_url} alt={point.name} />
              <PhotoTile src={promoter.photo_url} alt={promoter.name} />
            </div>

            {/* Onglets — Ce projet / Promoteur */}
            <div className="mb-4 flex gap-5 border-b border-black/10 dark:border-white/10">
              <TabButton active={tab === "projet"} onClick={() => setTab("projet")}>
                Ce projet
              </TabButton>
              <TabButton active={tab === "promoteur"} onClick={() => setTab("promoteur")}>
                Promoteur
              </TabButton>
            </div>

            {tab === "projet" ? (
              <>
                <AboutCard title={`À propos de ${point.name}`} bullets={[point.summary]} />
                <SourcesList sources={point.sources} />
                <p className="mt-6 text-xs text-neutral-500">
                  {formatLastVerified(point.last_verified)}
                </p>
              </>
            ) : (
              <>
                <AboutCard title={`À propos de ${promoter.name}`} bullets={promoter.about} />
                <SourcesList sources={promoter.sources} />
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function PhotoTile({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800">
      {/* Les images de démo (/promoteurs, /projets) sont des placeholders à
          remplacer par de vraies photos dans public/. */}
      <Image src={src} alt={alt} fill sizes="200px" className="object-cover" />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 pb-2 text-sm font-medium transition-colors",
        active
          ? "border-teal-600 text-teal-700 dark:text-teal-400"
          : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
      )}
    >
      {children}
    </button>
  );
}

function AboutCard({ title, bullets }: { title: string; bullets: string[] }) {
  return (
    <div className="mb-5 rounded-2xl bg-violet-50 p-4 dark:bg-violet-400/10">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-violet-900 dark:text-violet-200">
        <Sparkles className="h-4 w-4" aria-hidden />
        {title}
      </h2>
      <ul className="space-y-2">
        {bullets.map((bullet, i) => (
          <li
            key={i}
            className="text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300"
          >
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourcesList({ sources }: { sources: Source[] }) {
  const groups = groupSourcesByCategory(sources);
  const [openCategory, setOpenCategory] = useState<string | null>(
    groups[0]?.category ?? null
  );

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-neutral-500">Sources</h2>
      <div className="space-y-2">
        {groups.map((group) => {
          const isOpen = openCategory === group.category;
          const Icon = SOURCE_ICONS[group.category];
          return (
            <div key={group.category} className="overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setOpenCategory(isOpen ? null : group.category)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-2.5 text-sm font-medium">
                  <Icon className="h-4 w-4 text-neutral-500" aria-hidden />
                  {group.label}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-neutral-500 transition-transform",
                    isOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>

              {isOpen && (
                <ul>
                  {group.items.map((source) => (
                    <li key={source.url} className="border-t border-black/5 dark:border-white/5">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <span className="flex-1 truncate">
                          <span className="font-medium">{source.label}</span>
                          {source.description && (
                            <span className="text-neutral-500"> : {source.description}</span>
                          )}
                        </span>
                        {group.category === "reseaux_sociaux" ? (
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                        ) : (
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
