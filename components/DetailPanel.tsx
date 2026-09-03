"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Drawer } from "vaul";
import {
  ArrowUpRight,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Info,
  MapPin,
  Target,
  X
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { groupSourcesByType, PROJECT_PHASE_LABELS, type Project, type Promoter, type Source } from "@/lib/schema";
import { PHASE_TAG_COLOR } from "@/lib/status";
import type { PanelView } from "@/lib/panel-view";

export const PANEL_SNAP_POINTS = ["96px", 0.5, 0.92] as const;
export type PanelSnap = (typeof PANEL_SNAP_POINTS)[number];

interface DetailPanelProps {
  view: PanelView | null;
  canGoBack: boolean;
  snap: number | string | null;
  onSnapChange: (snap: number | string | null) => void;
  onClose: () => void;
  onBack: () => void;
  onOpenProject: (projectId: string) => void;
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
  view,
  canGoBack,
  snap,
  onSnapChange,
  onClose,
  onBack,
  onOpenProject
}: DetailPanelProps) {
  const isDesktop = useIsDesktop();
  const isPeek = snap === PANEL_SNAP_POINTS[0];

  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeaderCollapsed(false);
    setTab("apercu");
    scrollRef.current?.scrollTo({ top: 0 });
  }, [view]);

  useEffect(() => {
    if (!isDesktop) setHeaderCollapsed(false);
  }, [isDesktop]);

  function handleContentScroll() {
    if (!scrollRef.current) return;
    setHeaderCollapsed(scrollRef.current.scrollTop > 24);
  }

  useEffect(() => {
    if (!view) return;
    const resetPointerEvents = () => {
      if (document.body.style.pointerEvents === "none") document.body.style.pointerEvents = "";
    };
    resetPointerEvents();
    const observer = new MutationObserver(resetPointerEvents);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [view]);

  const title = view?.type === "project" ? view.project.name : view?.promoter.name ?? "";
  const statusPhase = view?.type === "project" ? view.project.status?.phase : undefined;
  const statusLabel = statusPhase ? PROJECT_PHASE_LABELS[statusPhase] : undefined;
  const statusColor = statusPhase ? PHASE_TAG_COLOR[statusPhase] : undefined;

  const [tab, setTab] = useState<"apercu" | "prix" | "promoteur">("apercu");

  const isFull = isDesktop || snap === PANEL_SNAP_POINTS[2];
  const showTabBar = !isPeek && view?.type === "project";

  return (
    <Drawer.Root
      open={!!view}
      onOpenChange={(open) => !open && onClose()}
      direction={isDesktop ? "right" : "bottom"}
      snapPoints={isDesktop ? undefined : [...PANEL_SNAP_POINTS]}
      activeSnapPoint={snap}
      setActiveSnapPoint={onSnapChange}
      dismissible={false}
      modal={false}
    >
      <Drawer.Portal>
        <Drawer.Content
          className={cn(
            "glass fixed z-20 flex flex-col outline-none",
            "inset-x-0 bottom-0 h-[92vh] rounded-t-4xl",
            "md:inset-y-0 md:bottom-0 md:right-0 md:left-auto md:h-full md:w-[480px] md:rounded-none md:border-l md:border-black/5"
          )}
        >
          <Drawer.Handle className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-neutral-400/60 md:hidden" />

          <div className="flex items-center gap-2 px-4 pb-2 pt-3">
            {canGoBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Retour"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
            )}
            <h1
              className={cn(
                "min-w-0 flex-1 truncate font-semibold transition-all",
                isPeek || headerCollapsed ? "text-sm" : "text-lg opacity-0 md:opacity-100"
              )}
            >
              {(isPeek || headerCollapsed) && title}
              {isPeek && statusLabel && (
                <span className={cn("ml-2 text-sm font-normal", statusColor)}>
                  {statusLabel}
                </span>
              )}
            </h1>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le panneau"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {!isPeek && view?.type === "project" && (
            <div ref={scrollRef} onScroll={handleContentScroll} className="flex-1 overflow-y-auto px-6 pb-8">
              <ProjectView
                project={view.project}
                promoter={view.promoter}
                tab={tab}
                setTab={setTab}
                showTabBar={showTabBar}
                onOpenProject={onOpenProject}
              />
            </div>
          )}

          {!isPeek && view?.type === "promoter" && (
            <div ref={scrollRef} onScroll={handleContentScroll} className="flex-1 overflow-y-auto px-6 pb-8">
              <PromoterView promoter={view.promoter} onOpenProject={onOpenProject} />
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ---------------------------------------------------------------------------
// Vue PROJET
// ---------------------------------------------------------------------------

type ProjectTab = "apercu" | "prix" | "promoteur";

function ProjectView({
  project,
  promoter,
  tab,
  setTab,
  showTabBar,
  onOpenProject
}: {
  project: Project;
  promoter: Promoter;
  tab: ProjectTab;
  setTab: (t: ProjectTab) => void;
  showTabBar: boolean;
  onOpenProject: (id: string) => void;
}) {
  const photos = [project.cover_image_url, ...(project.gallery ?? [])].filter(Boolean) as string[];
  const priceLabel = project.pricing?.summary ? formatPrice(project.pricing.summary) : null;

  return (
    <div>
      {photos.length > 0 && (
        <div className="-mx-6 mb-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6">
          {photos.map((src, i) => (
            <div key={i} className="relative aspect-[4/3] w-[80%] shrink-0 snap-center overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800">
              <Image src={src} alt={`${project.name} — photo ${i + 1}`} fill sizes="380px" className="object-cover" />
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold leading-tight">{project.name}</h2>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {[project.location.district, project.location.city].filter(Boolean).join(", ")}
        {project.location.precision !== "exact" && (
          <span className="text-neutral-400">· localisation approximative</span>
        )}
      </p>
      {project.status && (
        <span className={cn("mt-2 text-sm font-medium", PHASE_TAG_COLOR[project.status.phase])}>
          {PROJECT_PHASE_LABELS[project.status.phase]}
        </span>
      )}

      {showTabBar && (
        <div className="sticky -top-px z-10 -mx-6 mt-4 flex gap-5 border-b border-black/10 bg-white/95 px-6 backdrop-blur dark:border-white/10 dark:bg-neutral-900/95">
          {(["apercu", "prix", "promoteur"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px border-b-2 py-2.5 text-sm font-medium transition-colors",
                tab === t
                  ? "border-primary text-neutral-900 dark:text-white"
                  : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              )}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {tab === "apercu" && (
        <>
          {project.characteristics && project.characteristics.length > 0 && (
            <Section title="Caractéristiques" icon={<Target className="h-4 w-4" />}>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {project.characteristics.map((c) => (
                  <div key={c.label}>
                    <dt className="text-xs text-neutral-500">{c.label}</dt>
                    <dd className="text-sm font-medium">{c.value}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}

          {project.timeline && project.timeline.length > 0 && (
            <Section title="Historique" icon={<Info className="h-4 w-4" />}>
              <ol className="space-y-3">
                {project.timeline.map((entry, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-16 shrink-0 text-xs text-neutral-500">{entry.date}</span>
                    <span className="text-sm">{entry.label}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {project.public_information && project.public_information.length > 0 && (
            <Section title="À savoir" icon={<Info className="h-4 w-4" />}>
              <PublicInfoList items={project.public_information} />
            </Section>
          )}

          <SourcesSection sources={project.sources} />
        </>
      )}

      {tab === "prix" && (
        <>
          {(priceLabel || project.pricing?.by_unit?.length) && (
            <Section title="Prix" icon={<Target className="h-4 w-4" />}>
              {priceLabel && (
                <p className="text-2xl font-semibold">{priceLabel}</p>
              )}
              {project.pricing?.by_unit && project.pricing.by_unit.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-neutral-500">Unités</p>
                  <UnitsList units={project.pricing.by_unit} />
                </div>
              )}
            </Section>
          )}
        </>
      )}

      {tab === "promoteur" && (
        <PromoterInline promoter={promoter} onOpenProject={onOpenProject} />
      )}
    </div>
  );
}

const TAB_LABELS: Record<ProjectTab, string> = {
  apercu: "Aperçu",
  prix: "Prix",
  promoteur: "Promoteur"
};

// ---------------------------------------------------------------------------
// Vue Promoteur INLINE (dans l'onglet du projet)
// ---------------------------------------------------------------------------

function PromoterInline({
  promoter,
  onOpenProject
}: {
  promoter: Promoter;
  onOpenProject: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 pt-1">
        {promoter.photo_url ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <Image src={promoter.photo_url} alt={promoter.name} fill sizes="56px" className="object-cover" />
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
            <Building2 className="h-6 w-6 text-neutral-500" aria-hidden />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold leading-tight">{promoter.name}</h2>
          {promoter.legal_name && promoter.legal_name !== promoter.name && (
            <p className="truncate text-sm text-neutral-500">{promoter.legal_name}</p>
          )}
        </div>
      </div>

      {promoter.company && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
          {promoter.company.activity && <span>{promoter.company.activity}</span>}
          {promoter.company.founded_year && <span>Depuis {promoter.company.founded_year}</span>}
          {promoter.company.website && (
            <a
              href={promoter.company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-teal-700 hover:underline dark:text-teal-400"
            >
              <Globe className="h-3.5 w-3.5" aria-hidden />
              Site officiel
            </a>
          )}
        </div>
      )}

      {promoter.public_information && promoter.public_information.length > 0 && (
        <Section title="À savoir" icon={<Info className="h-4 w-4" />}>
          <PublicInfoList items={promoter.public_information} />
        </Section>
      )}

      <Section title={promoter.projects.length > 1 ? "Ses projets" : "Son projet"} icon={<MapPin className="h-4 w-4" />}>
        <ul className="divide-y divide-black/5 dark:divide-white/5">
          {promoter.projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => onOpenProject(project.id)}
                className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/10"
              >
                {project.cover_image_url ? (
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
                    <Image src={project.cover_image_url} alt={project.name} fill sizes="44px" className="object-cover" />
                  </div>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10">
                    <MapPin className="h-4 w-4 text-neutral-500" aria-hidden />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {[project.location.district, project.location.city].filter(Boolean).join(", ")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <SourcesSection sources={promoter.sources} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vue PROMOTEUR standalone (quand on sélectionne un promoteur via recherche)
// ---------------------------------------------------------------------------

function PromoterView({
  promoter,
  onOpenProject
}: {
  promoter: Promoter;
  onOpenProject: (projectId: string) => void;
}) {
  return <PromoterInline promoter={promoter} onOpenProject={onOpenProject} />;
}

// ---------------------------------------------------------------------------
// Composants partagés
// ---------------------------------------------------------------------------

function Section({ title, icon, children }: { title?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-black/5 pt-5 first:mt-4 first:border-none first:pt-0 dark:border-white/5">
      {title && (
        <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-teal-700 dark:text-teal-500">
          {icon}
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function UnitsList({ units: unitList }: { units: NonNullable<Project["pricing"]>["by_unit"] }) {
  return (
    <ul className="divide-y divide-black/5 dark:divide-white/5">
      {(unitList ?? []).map((unit, i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <div>
            <p className="font-medium">{unit.typology}</p>
            <p className="text-xs text-neutral-500">
              {[
                unit.surface_sqm ? `${unit.surface_sqm} m²` : null,
                unit.bedrooms ? `${unit.bedrooms} ch.` : null,
                unit.bathrooms ? `${unit.bathrooms} sdb` : null
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {unit.price && <p className="shrink-0 text-sm font-medium">{formatPrice(unit.price)}</p>}
        </li>
      ))}
    </ul>
  );
}

function PublicInfoList({ items }: { items: { title: string; description: string }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 rounded-2xl bg-black/5 px-3 py-2.5 dark:bg-white/5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
          <div>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              {item.description}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SourcesSection({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  if (sources.length === 0) return null;
  const groups = groupSourcesByType(sources);

  return (
    <Section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-1 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold">Sources — {sources.length}</span>
        <ChevronDown className={cn("h-4 w-4 text-neutral-500 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="mt-2 space-y-4">
          {groups.map((group) => (
            <div key={group.type}>
              <p className="mb-1.5 text-xs font-medium text-neutral-500">{group.label}</p>
              <ul className="space-y-1">
                {group.items.map((source) => (
                  <li key={source.id}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <span className="flex-1 truncate">{source.title}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
