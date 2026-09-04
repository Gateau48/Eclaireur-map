"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Sheet, useScrollPosition } from "react-modal-sheet";
import {
  ArrowUpRight,
  Building2,
  Camera,
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
import {
  PROJECT_PHASE_LABELS,
  SOURCE_TYPE_LABELS,
  type Project,
  type Promoter,
  type Source
} from "@/lib/schema";
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

const MOBILE_SHEET_SNAPS = [96, 0.5, 0.92] as const;

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
  const scrollElRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [tab, setTab] = useState<"apercu" | "prix" | "promoteur" | "photos">("apercu");
  const [lightboxPhoto, setLightboxPhoto] = useState<{ src: string; alt: string; index: number; all: { src: string; alt: string }[] } | null>(null);

  // Library scroll tracking pour le handoff scroll→drag
  const { scrollRef: libScrollRef, scrollPosition } = useScrollPosition({ isEnabled: !!view });

  // Combiner le ref de la library avec notre ref local
  const combinedScrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      libScrollRef(node);
      scrollElRef.current = node;
    },
    [libScrollRef]
  );

  useEffect(() => {
    setTab("apercu");
    setHeaderCollapsed(false);
    setLightboxPhoto(null);
    scrollElRef.current?.scrollTo({ top: 0 });
  }, [view]);

  // Mesurer la hauteur de la zone titre+photos pour le seuil de collapse
  useEffect(() => {
    if (!headerRef.current || headerCollapsed) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setHeaderHeight(entry.contentRect.height);
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [view, headerCollapsed]);

  const handleScroll = useCallback(() => {
    const el = scrollElRef.current;
    if (!el) return;
    const threshold = headerHeight > 0 ? headerHeight - 20 : 120;
    setHeaderCollapsed(el.scrollTop >= threshold);
  }, [headerHeight]);

  useEffect(() => {
    if (!view) return;
    const resetPointerEvents = () => {
      if (document.body.style.pointerEvents === "none")
        document.body.style.pointerEvents = "";
    };
    resetPointerEvents();
    const observer = new MutationObserver(resetPointerEvents);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"]
    });
    return () => observer.disconnect();
  }, [view]);

  const handleSheetSnap = useCallback((index: number) => {
    onSnapChange(MOBILE_SHEET_SNAPS[index]);
  }, [onSnapChange]);

  const title = view?.type === "project" ? view.project.name : view?.promoter.name ?? "";
  const project = view?.type === "project" ? view.project : undefined;
  const promoter = view?.type === "project" ? view.promoter : view?.promoter;

  // Contenu unique du scroll — titre + photos + sticky header + tabs + contenu
  const scrollBody = view ? (
    <div className="flex h-full flex-col">
      <div
        ref={combinedScrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {/* Titre complet + status + photos — défile hors de vue naturellement */}
        {project && (
          <div ref={headerRef} className="px-4 pb-3 pt-2">
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
          </div>
        )}

        {/* Photos carousel — défile hors de vue naturellement */}
        {project && (() => {
          const photos = [project.cover_image_url, ...(project.gallery ?? [])].filter(Boolean) as string[];
          const allPhotoObjects = photos.map((src, i) => ({
            src,
            alt: `${project.name} — photo ${i + 1}`
          }));
          return photos.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto scroll-hidden snap-x snap-mandatory px-4 pb-4">
              {photos.slice(0, 6).map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxPhoto({ src, alt: `${project.name} — photo ${i + 1}`, index: i, all: allPhotoObjects })}
                  className="relative w-[75%] shrink-0 snap-center aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-200"
                >
                  <Image
                    src={src}
                    alt={`${project.name} — photo ${i + 1}`}
                    fill
                    sizes="300px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null;
        })()}

        {/* Header sticky : titre tronqué + X + onglets — reste en haut au scroll */}
        <div className="sticky top-0 z-10 bg-white">
          {/* Titre tronqué + X — visible quand le titre complet a défilé */}
          {headerCollapsed && (
            <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2.5">
              {canGoBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Retour"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-sm font-semibold">{title}</h1>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer le panneau"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}

          {/* Onglets — TOUJOURS visibles, sticky */}
          {project && (
            <div className="border-b border-neutral-200 px-4">
              <div className="flex gap-5">
                {(["apercu", "prix", "promoteur", "photos"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={cn(
                      "-mb-px border-b-2 py-2.5 text-sm font-medium transition-colors",
                      tab === t
                        ? "border-primary text-primary"
                        : "border-transparent text-neutral-500 hover:text-neutral-800"
                    )}
                  >
                    {TAB_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contenu de l'onglet */}
        <div className="bg-[#f0f4ff] px-4 pb-8">
          {view.type === "project" ? (
            <>
              {tab === "apercu" && <ApercuTab project={view.project} />}
              {tab === "prix" && <PrixTab project={view.project} />}
              {tab === "promoteur" && (
                <PromoterInline
                  promoter={view.promoter}
                  onOpenProject={onOpenProject}
                  onPhotoClick={(src, alt, index, all) =>
                    setLightboxPhoto({ src, alt, index, all })
                  }
                />
              )}
              {tab === "photos" && (
                <PhotosTab
                  project={view.project}
                  promoter={view.promoter}
                  onPhotoClick={(src, alt, index, all) =>
                    setLightboxPhoto({ src, alt, index, all })
                  }
                />
              )}
            </>
          ) : (
            <PromoterView
              promoter={view.promoter}
              onOpenProject={onOpenProject}
              onPhotoClick={(src, alt, index, all) =>
                setLightboxPhoto({ src, alt, index, all })
              }
            />
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Mobile : react-modal-sheet avec scroll/drag handoff correct */}
      {!isDesktop && (
        <Sheet
          isOpen={!!view}
          onClose={onClose}
          snapPoints={[96, 0.5, 0.92]}
          initialSnap={1}
          onSnap={handleSheetSnap}
          disableDismiss
        >
          <Sheet.Container>
            <Sheet.Header>
              <Sheet.DragIndicator />
            </Sheet.Header>
            <Sheet.Content
              disableScroll
              disableDrag={scrollPosition != null && scrollPosition !== "top"}
            >
              {scrollBody}
            </Sheet.Content>
          </Sheet.Container>
          <Sheet.Backdrop />
        </Sheet>
      )}

      {/* Desktop : panneau fixe à droite */}
      {isDesktop && view && (
        <div className="fixed inset-y-0 right-0 z-20 flex w-[480px] flex-col border-l border-neutral-200 bg-white shadow-lg">
          {scrollBody}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <PhotoLightbox
          src={lightboxPhoto.src}
          alt={lightboxPhoto.alt}
          index={lightboxPhoto.index}
          allPhotos={lightboxPhoto.all}
          onClose={() => setLightboxPhoto(null)}
          onNavigate={(i) => {
            const p = lightboxPhoto.all[i];
            if (p) setLightboxPhoto((prev) => prev ? { ...prev, src: p.src, alt: p.alt, index: i } : null);
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Lightbox Photos
// ---------------------------------------------------------------------------

function PhotoLightbox({
  src,
  alt,
  index,
  allPhotos,
  onClose,
  onNavigate
}: {
  src: string;
  alt: string;
  index: number;
  allPhotos: { src: string; alt: string }[];
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const [touchStart, setTouchStart] = useState<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && index < allPhotos.length - 1) onNavigate(index + 1);
      if (diff < 0 && index > 0) onNavigate(index - 1);
    }
    setTouchStart(null);
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < allPhotos.length - 1) onNavigate(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, allPhotos.length, onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
        aria-label="Fermer"
      >
        <X className="h-5 w-5" />
      </button>

      {index > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate(index - 1); }}
          className="absolute left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
          aria-label="Photo précédente"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {index < allPhotos.length - 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate(index + 1); }}
          className="absolute right-14 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
          aria-label="Photo suivante"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div className="relative max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={900}
          className="max-h-[85vh] rounded-lg object-contain"
          priority
        />
      </div>

      <div className="absolute bottom-4 text-sm text-white/70">
        {index + 1} / {allPhotos.length}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vue PROJET
// ---------------------------------------------------------------------------

type ProjectTab = "apercu" | "prix" | "promoteur" | "photos";

function ProjectView({
  project,
  promoter,
  tab,
  setTab,
  onOpenProject,
  onPhotoClick
}: {
  project: Project;
  promoter: Promoter;
  tab: ProjectTab;
  setTab: (t: ProjectTab) => void;
  onOpenProject: (id: string) => void;
  onPhotoClick: (src: string, alt: string, index: number, all: { src: string; alt: string }[]) => void;
}) {
  const photos = [project.cover_image_url, ...(project.gallery ?? [])].filter(Boolean) as string[];
  const priceLabel = project.pricing?.summary ? formatPrice(project.pricing.summary) : null;

  const allPhotoObjects = photos.map((src, i) => ({
    src,
    alt: `${project.name} — photo ${i + 1}`
  }));

  return (
    <div>
      {/* Titre + statut — défile quand on scrolle */}
      <div className="px-4 pb-3 pt-2">
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
      </div>

      {/* Photos GRANDES — carousel horizontal, défile quand on scrolle */}
      {photos.length > 0 && (
        <div className="flex gap-3 overflow-x-auto scroll-hidden snap-x snap-mandatory px-4 pb-4">
          {photos.slice(0, 6).map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPhotoClick(src, `${project.name} — photo ${i + 1}`, i, allPhotoObjects)}
              className="relative w-[75%] shrink-0 snap-center aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-200"
            >
              <Image
                src={src}
                alt={`${project.name} — photo ${i + 1}`}
                fill
                sizes="300px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Onglets — sticky dans le scroll, reste visible quand on scrolle */}
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-4">
        <div className="flex gap-5">
          {(["apercu", "prix", "promoteur", "photos"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px border-b-2 py-2.5 text-sm font-medium transition-colors",
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              )}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu de l'onglet — fond lavande */}
      <div className="bg-[#f0f4ff] px-4 pb-8">
        {tab === "apercu" && (
          <ApercuTab project={project} />
        )}

        {tab === "prix" && (
          <PrixTab project={project} />
        )}

        {tab === "promoteur" && (
          <PromoterInline
            promoter={promoter}
            onOpenProject={onOpenProject}
            onPhotoClick={onPhotoClick}
          />
        )}

        {tab === "photos" && (
          <PhotosTab
            project={project}
            promoter={promoter}
            onPhotoClick={onPhotoClick}
          />
        )}
      </div>
    </div>
  );
}

const TAB_LABELS: Record<ProjectTab, string> = {
  apercu: "Aperçu",
  prix: "Prix",
  promoteur: "Promoteur",
  photos: "Photos"
};

// ---------------------------------------------------------------------------
// Onglet Aperçu
// ---------------------------------------------------------------------------

function ApercuTab({ project }: { project: Project }) {
  return (
    <div className="space-y-5 pt-1">
      {project.description && (
        <Section title={`A propos de ${project.name.split(" ")[0]}...`} icon={<Info className="h-4 w-4" />}>
          <p className="text-sm leading-relaxed text-neutral-700">{project.description}</p>
        </Section>
      )}

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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onglet Prix
// ---------------------------------------------------------------------------

function PrixTab({ project }: { project: Project }) {
  const priceLabel = project.pricing?.summary ? formatPrice(project.pricing.summary) : null;

  return (
    <div className="space-y-5 pt-1">
      {priceLabel && (
        <Section title="À propos du prix" icon={<Info className="h-4 w-4" />}>
          <p className="text-2xl font-semibold">{priceLabel}</p>
        </Section>
      )}

      {project.pricing?.by_unit && project.pricing.by_unit.length > 0 && (
        <Section title="Units" icon={<Target className="h-4 w-4" />}>
          <UnitsList units={project.pricing.by_unit} />
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Photos Tab — galerie complète
// ---------------------------------------------------------------------------

function PhotosTab({
  project,
  promoter,
  onPhotoClick
}: {
  project: Project;
  promoter: Promoter;
  onPhotoClick: (src: string, alt: string, index: number, all: { src: string; alt: string }[]) => void;
}) {
  const allPhotos: { src: string; alt: string }[] = [];

  if (project.cover_image_url) {
    allPhotos.push({ src: project.cover_image_url, alt: `${project.name} — cover` });
  }
  for (const url of project.gallery ?? []) {
    allPhotos.push({ src: url, alt: `${project.name} — galerie` });
  }
  if (promoter.photo_url) {
    allPhotos.push({ src: promoter.photo_url, alt: `${promoter.name} — photo promoteur` });
  }

  if (allPhotos.length === 0) {
    return <p className="text-sm text-neutral-500">Aucune photo disponible.</p>;
  }

  return (
    <Section title="Toutes les photos" icon={<Camera className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {allPhotos.map((photo, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPhotoClick(photo.src, photo.alt, i, allPhotos)}
            className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-200"
          >
            <Image src={photo.src} alt={photo.alt} fill sizes="200px" className="object-cover" />
          </button>
        ))}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Promoteur INLINE
// ---------------------------------------------------------------------------

function PromoterInline({
  promoter,
  onOpenProject,
  onPhotoClick
}: {
  promoter: Promoter;
  onOpenProject: (id: string) => void;
  onPhotoClick: (src: string, alt: string, index: number, all: { src: string; alt: string }[]) => void;
}) {
  const promoterPhotos: { src: string; alt: string }[] = promoter.photo_url
    ? [{ src: promoter.photo_url, alt: promoter.name }]
    : [];

  return (
    <div className="space-y-5 pt-1">
      <div>
        <h2 className="text-2xl font-bold leading-tight">{promoter.name}</h2>
        {promoter.legal_name && promoter.legal_name !== promoter.name && (
          <p className="mt-0.5 text-sm text-neutral-500">{promoter.legal_name}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {promoter.company?.founded_year && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Building2 className="h-3 w-3" />
              Depuis {promoter.company.founded_year}
            </span>
          )}
          {promoter.company?.activity && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {promoter.company.activity}
            </span>
          )}
          {promoter.projects.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <MapPin className="h-3 w-3" />
              + de {promoter.projects.length} propriétés
            </span>
          )}
        </div>
      </div>

      {/* Bio + photo côte à côte */}
      {(promoter.bio || promoter.photo_url) && (
        <div className="grid grid-cols-[140px_1fr] gap-4">
          {promoter.photo_url && (
            <button
              type="button"
              onClick={() => promoter.photo_url && onPhotoClick(promoter.photo_url, promoter.name, 0, promoterPhotos)}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-200"
            >
              <Image src={promoter.photo_url} alt={promoter.name} fill sizes="140px" className="object-cover" />
            </button>
          )}
          {promoter.bio && (
            <div className="overflow-y-auto rounded-xl bg-white p-3">
              <p className="mb-1 text-sm font-semibold text-teal-700">A propos du promoteur</p>
              <p className="text-sm leading-relaxed text-neutral-600">{promoter.bio}</p>
            </div>
          )}
        </div>
      )}

      {promoter.company?.website && (
        <a
          href={promoter.company.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"
        >
          <Globe className="h-3.5 w-3.5" aria-hidden />
          Site officiel
        </a>
      )}

      <Section
        title={promoter.projects.length > 1 ? "Ses projets" : "Son projet"}
        icon={<MapPin className="h-4 w-4" />}
      >
        <ul className="divide-y divide-neutral-200">
          {promoter.projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => onOpenProject(project.id)}
                className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-white/60"
              >
                {project.cover_image_url ? (
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-neutral-200">
                    <Image src={project.cover_image_url} alt={project.name} fill sizes="44px" className="object-cover" />
                  </div>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                    <MapPin className="h-4 w-4 text-neutral-400" aria-hidden />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary">{project.name}</p>
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

      <SourcesSection sources={promoter.sources ?? []} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Promoteur standalone (via recherche)
// ---------------------------------------------------------------------------

function PromoterView({
  promoter,
  onOpenProject,
  onPhotoClick
}: {
  promoter: Promoter;
  onOpenProject: (projectId: string) => void;
  onPhotoClick: (src: string, alt: string, index: number, all: { src: string; alt: string }[]) => void;
}) {
  return (
    <div className="px-4 pb-8 pt-2">
      <PromoterInline promoter={promoter} onOpenProject={onOpenProject} onPhotoClick={onPhotoClick} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composants partagés
// ---------------------------------------------------------------------------

function Section({ title, icon, children }: { title?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-t border-neutral-200 pt-4 first:border-none first:pt-0">
      {title && (
        <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-teal-700">
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
    <ul className="divide-y divide-neutral-200">
      {(unitList ?? []).map((unit, i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <div>
            <p className="font-medium">{unit.typology}</p>
            <p className="text-xs text-neutral-500">
              {[unit.surface_sqm ? `${unit.surface_sqm} m²` : null, unit.bedrooms ? `${unit.bedrooms} ch.` : null, unit.bathrooms ? `${unit.bathrooms} sdb` : null]
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
        <li key={i} className="flex gap-2.5 rounded-xl bg-white px-3 py-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
          <div>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-neutral-600">{item.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SourcesSection({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  if (sources.length === 0) return null;

  return (
    <Section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-1 text-left"
        aria-expanded={open}
      >
        <div>
          <span className="text-sm font-semibold text-neutral-700">Sources publiques</span>
          <p className="text-xs text-neutral-500">Ces informations proviennent de sources vérifiées — cliquez pour les consulter.</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-neutral-500 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {sources.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm transition-colors hover:bg-neutral-50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-400">{SOURCE_TYPE_LABELS[source.type] ?? source.type}</p>
                <p className="truncate text-sm font-medium text-neutral-800">{source.title}</p>
                {source.published_at && (
                  <p className="mt-0.5 text-xs text-neutral-400">Publié le {source.published_at}</p>
                )}
              </div>
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
            </a>
          ))}
        </div>
      )}
    </Section>
  );
}
