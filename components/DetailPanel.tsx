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
  X
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { groupSourcesByType, PROJECT_PHASE_LABELS, type Project, type Promoter, type Source } from "@/lib/schema";
import type { PanelView } from "@/lib/panel-view";

// GARDE-FOU DE VALEURS : le point le plus bas est une hauteur en PIXELS
// fixe (pas une fraction) — c'est juste assez pour "titre + X sur une
// seule ligne", quelle que soit la taille de l'écran. Vaul accepte de
// mélanger px et fractions dans le même tableau de snap points.
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
  onOpenPromoter: (promoterId: string) => void;
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
  onOpenProject,
  onOpenPromoter
}: DetailPanelProps) {
  const isDesktop = useIsDesktop();
  const isPeek = snap === PANEL_SNAP_POINTS[0];
  const isFull = snap === PANEL_SNAP_POINTS[2];

  // En-tête compact + menu à onglets : n'apparaît qu'une fois scrollé dans
  // le contenu EN plein écran (comme Google Maps) — se réinitialise à
  // chaque nouvelle sélection ou dès qu'on quitte le plein écran.
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeaderCollapsed(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [view]);

  useEffect(() => {
    if (!isFull) setHeaderCollapsed(false);
  }, [isFull]);

  function handleContentScroll() {
    if (!isFull || !scrollRef.current) return;
    setHeaderCollapsed(scrollRef.current.scrollTop > 24);
  }

  // GARDE-FOU : contourne un bug connu de Vaul en usage contrôlé avec
  // modal={false} — Vaul pose `document.body.style.pointerEvents = 'none'`
  // à l'ouverture et ne le réinitialise pas correctement quand `open` est
  // piloté par notre propre état plutôt que par <Drawer.Trigger>
  // (voir https://github.com/emilkowalski/vaul/issues/509 et /issues/534).
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

  return (
    <Drawer.Root
      open={!!view}
      onOpenChange={(open) => !open && onClose()}
      direction={isDesktop ? "right" : "bottom"}
      snapPoints={isDesktop ? undefined : [...PANEL_SNAP_POINTS]}
      activeSnapPoint={snap}
      setActiveSnapPoint={onSnapChange}
      // GARDE-FOU : ne se ferme JAMAIS en glissant plus bas que le point le
      // plus bas — seul le X ferme, comme demandé (comportement observé
      // sur Google Maps : au plancher, glisser encore ne fait plus rien).
      dismissible={false}
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

          {/* Barre compacte, toujours visible : titre tronqué + retour +
              fermer. Devient le SEUL contenu visible au repli (peek), et
              redevient la barre sticky sous le contenu quand on scrolle en
              plein écran (headerCollapsed). */}
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

          {!isPeek && (
            <div ref={scrollRef} onScroll={handleContentScroll} className="flex-1 overflow-y-auto px-6 pb-8">
              {view?.type === "project" && (
                <ProjectView
                  project={view.project}
                  promoter={view.promoter}
                  headerCollapsed={headerCollapsed}
                  onOpenPromoter={() => onOpenPromoter(view.promoter.id)}
                />
              )}
              {view?.type === "promoter" && (
                <PromoterView promoter={view.promoter} onOpenProject={onOpenProject} />
              )}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ---------------------------------------------------------------------------
// Vue PROJET — carrousel photo, onglets (Aperçu / Unités / À savoir) qui
// n'apparaissent que si le contenu le justifie.
// ---------------------------------------------------------------------------

type ProjectTab = "apercu" | "unites" | "savoir";

function ProjectView({
  project,
  promoter,
  headerCollapsed,
  onOpenPromoter
}: {
  project: Project;
  promoter: Promoter;
  headerCollapsed: boolean;
  onOpenPromoter: () => void;
}) {
  const hasUnites = !!project.pricing?.by_unit?.length;
  const hasSavoir = !!project.public_information?.length || project.sources.length > 0;
  // Onglet unique = pas la peine d'un menu à onglets, tout défile d'affilée
  // (comme une fiche Google Maps simple sans avis ni photos).
  const tabs: ProjectTab[] = ["apercu", ...(hasUnites ? (["unites"] as const) : []), ...(hasSavoir ? (["savoir"] as const) : [])];
  const [tab, setTab] = useState<ProjectTab>("apercu");
  const showTabBar = headerCollapsed && tabs.length > 1;

  const photos = [project.cover_image_url, ...(project.gallery ?? [])].filter(Boolean) as string[];
  const priceLabel = project.pricing?.summary ? formatPrice(project.pricing.summary) : null;

  return (
    <div>
      {photos.length > 0 && (
        <div className="-mx-6 mb-4 flex snap-x snap-mandatory gap-0 overflow-x-auto">
          {photos.map((src, i) => (
            <div key={i} className="relative aspect-[16/10] w-full shrink-0 snap-center bg-neutral-200 dark:bg-neutral-800">
              <Image src={src} alt={`${project.name} — photo ${i + 1}`} fill sizes="420px" className="object-cover" />
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
      <button
        type="button"
        onClick={onOpenPromoter}
        className="mt-1.5 flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
      >
        {promoter.name}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>
      {project.status && (
        <span className="mt-3 inline-flex items-center rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
          {PROJECT_PHASE_LABELS[project.status.phase]}
        </span>
      )}

      {/* Menu à onglets — sticky, n'apparaît qu'au scroll en plein écran,
          avec la ligne d'accent sous l'onglet actif (comme Google Maps). */}
      {showTabBar && (
        <div className="sticky -top-px z-10 -mx-6 mt-4 flex gap-5 border-b border-black/10 bg-white/95 px-6 backdrop-blur dark:border-white/10 dark:bg-neutral-900/95">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px border-b-2 py-2.5 text-sm font-medium transition-colors",
                tab === t
                  ? "border-teal-600 text-neutral-900 dark:text-white"
                  : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              )}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {(tab === "apercu" || !showTabBar) && (
        <>
          {(priceLabel || project.pricing?.by_unit?.length) && (
            <Section>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {priceLabel && <Stat label="Prix" value={priceLabel} />}
                {project.pricing?.by_unit?.length && (
                  <Stat label="Typologies" value={`${project.pricing.by_unit.length}`} />
                )}
              </div>
            </Section>
          )}

          {project.characteristics && project.characteristics.length > 0 && (
            <Section title="Caractéristiques">
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

          <Section title="Promoteur">
            <PromoterPreviewCard promoter={promoter} onClick={onOpenPromoter} />
          </Section>

          {project.timeline && project.timeline.length > 0 && (
            <Section title="Historique">
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

          {!hasUnites && !hasSavoir && null}
        </>
      )}

      {tab === "unites" && showTabBar && project.pricing?.by_unit && (
        <Section>
          <UnitsList units={project.pricing.by_unit} />
        </Section>
      )}
      {tab === "apercu" && !showTabBar && hasUnites && project.pricing?.by_unit && (
        <Section title="Unités">
          <UnitsList units={project.pricing.by_unit} />
        </Section>
      )}

      {(tab === "savoir" || !showTabBar) && (
        <>
          {project.public_information && project.public_information.length > 0 && (
            <Section title="À savoir">
              <PublicInfoList items={project.public_information} />
            </Section>
          )}
          <SourcesSection sources={project.sources} />
        </>
      )}
    </div>
  );
}

const TAB_LABELS: Record<ProjectTab, string> = {
  apercu: "Aperçu",
  unites: "Unités",
  savoir: "À savoir"
};

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

function PromoterPreviewCard({ promoter, onClick }: { promoter: Promoter; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"
    >
      {promoter.photo_url ? (
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <Image src={promoter.photo_url} alt={promoter.name} fill sizes="40px" className="object-cover" />
        </div>
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
          <Building2 className="h-4 w-4 text-neutral-500" aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{promoter.name}</p>
        <p className="text-xs text-neutral-500">
          {promoter.projects.length > 1 ? `${promoter.projects.length} projets identifiés` : "1 projet identifié"}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Vue PROMOTEUR
// ---------------------------------------------------------------------------

function PromoterView({
  promoter,
  onOpenProject
}: {
  promoter: Promoter;
  onOpenProject: (projectId: string) => void;
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
        <Section title="À savoir">
          <PublicInfoList items={promoter.public_information} />
        </Section>
      )}

      <Section title={promoter.projects.length > 1 ? "Ses projets" : "Son projet"}>
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
// Composants partagés
// ---------------------------------------------------------------------------

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-black/5 pt-5 first:mt-4 first:border-none first:pt-0 dark:border-white/5">
      {title && <h3 className="mb-2.5 text-sm font-semibold">{title}</h3>}
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
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