"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Drawer } from "vaul";
import {
  ArrowUpRight,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  Info,
  MapPin,
  X
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { groupSourcesByType, PROJECT_PHASE_LABELS, type Project, type Promoter, type Source } from "@/lib/schema";
import type { PanelView } from "@/lib/panelview";

const SNAP_POINTS = [0.15, 0.5, 0.92] as const;

interface DetailPanelProps {
  view: PanelView | null;
  canGoBack: boolean;
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

export function DetailPanel({ view, canGoBack, onClose, onBack, onOpenProject, onOpenPromoter }: DetailPanelProps) {
  const isDesktop = useIsDesktop();
  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[1]);

  useEffect(() => {
    if (view) setSnap(SNAP_POINTS[1]);
  }, [view]);

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

  return (
    <Drawer.Root
      open={!!view}
      onOpenChange={(open) => !open && onClose()}
      direction={isDesktop ? "right" : "bottom"}
      snapPoints={isDesktop ? undefined : [...SNAP_POINTS]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
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

          {/* Barre de navigation du panneau — retour si on a navigué
              (projet → promoteur), toujours une fermeture explicite. */}
          <div className="flex items-center justify-between px-4 pt-3">
            {canGoBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-teal-700 hover:bg-black/5 dark:text-teal-400 dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Retour
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le panneau"
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-8 pt-2">
            {view?.type === "project" && (
              <ProjectView
                project={view.project}
                promoter={view.promoter}
                onOpenPromoter={() => onOpenPromoter(view.promoter.id)}
              />
            )}
            {view?.type === "promoter" && (
              <PromoterView promoter={view.promoter} onOpenProject={onOpenProject} />
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ---------------------------------------------------------------------------
// Vue PROJET — HEADER / APERÇU / CARACTÉRISTIQUES / UNITÉS / PROMOTEUR /
// TIMELINE / À SAVOIR / SOURCES — chaque section masquée si sa donnée est absente.
// ---------------------------------------------------------------------------

function ProjectView({
  project,
  promoter,
  onOpenPromoter
}: {
  project: Project;
  promoter: Promoter;
  onOpenPromoter: () => void;
}) {
  const priceLabel = project.pricing?.summary ? formatPrice(project.pricing.summary) : null;
  const unitCount = project.pricing?.by_unit?.length;

  return (
    <div>
      {/* HEADER */}
      {project.cover_image_url && (
        <div className="relative -mx-6 mb-4 aspect-[16/10] overflow-hidden bg-neutral-200 dark:bg-neutral-800">
          <Image src={project.cover_image_url} alt={project.name} fill sizes="420px" className="object-cover" />
        </div>
      )}

      <h1 className="text-xl font-semibold leading-tight">{project.name}</h1>

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
      {project.status?.detail && (
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          {project.status.detail}
        </p>
      )}

      {/* APERÇU — prix + quelques chiffres clés */}
      {(priceLabel || unitCount) && (
        <Section>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {priceLabel && <Stat label="Prix" value={priceLabel} />}
            {unitCount && <Stat label="Typologies" value={`${unitCount}`} />}
          </div>
        </Section>
      )}

      {/* CARACTÉRISTIQUES */}
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

      {/* UNITÉS */}
      {project.pricing?.by_unit && project.pricing.by_unit.length > 0 && (
        <Section title="Unités">
          <ul className="divide-y divide-black/5 dark:divide-white/5">
            {project.pricing.by_unit.map((unit, i) => (
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
                {unit.price && (
                  <p className="shrink-0 text-sm font-medium">{formatPrice(unit.price)}</p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* PROMOTEUR — aperçu, navigation vers sa fiche */}
      <Section title="Promoteur">
        <button
          type="button"
          onClick={onOpenPromoter}
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
              {promoter.projects.length > 1
                ? `${promoter.projects.length} projets identifiés`
                : "1 projet identifié"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
        </button>
      </Section>

      {/* TIMELINE */}
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

      {/* À SAVOIR — fait documenté et sourcé, jamais un jugement */}
      {project.public_information && project.public_information.length > 0 && (
        <Section title="À savoir">
          <ul className="space-y-3">
            {project.public_information.map((item, i) => (
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
        </Section>
      )}

      <SourcesSection sources={project.sources} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vue PROMOTEUR — bio, à savoir, ses projets (chacun renvoie vers la carte)
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
      <div className="flex items-center gap-3">
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
          <h1 className="truncate text-xl font-semibold leading-tight">{promoter.name}</h1>
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
          <ul className="space-y-3">
            {promoter.public_information.map((item, i) => (
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
    <div className="mt-5 border-t border-black/5 pt-5 first:mt-0 first:border-none first:pt-0 dark:border-white/5">
      {title && <h2 className="mb-2.5 text-sm font-semibold">{title}</h2>}
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