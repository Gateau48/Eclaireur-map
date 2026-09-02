"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Drawer } from "vaul";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  ExternalLink,
  Flag,
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
  type Point,
  type Promoter,
  type Source
} from "@/lib/schema";
import {
  ISSUE_CATEGORY_LABELS,
  STATUS_ICON_CLASS,
  STATUS_ICONS,
  STATUS_LABELS,
  STATUS_SOFT_CLASS
} from "@/lib/status";

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
  /** Autres projets du même promoteur — pour le renvoi croisé de risque :
   *  un projet "agréé" ne doit pas masquer un problème confirmé ailleurs
   *  chez le même promoteur. C'est le genre de trou qu'un promoteur
   *  malhonnête exploiterait. */
  otherPointsFromPromoter: Point[];
  initialTab?: Tab;
  onClose: () => void;
  onSelectOtherPoint: (point: Point) => void;
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
  otherPointsFromPromoter,
  initialTab = "projet",
  onClose,
  onSelectOtherPoint,
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

  // GARDE-FOU : contourne un bug connu de Vaul en usage contrôlé avec
  // modal={false} — Vaul pose `document.body.style.pointerEvents = 'none'`
  // à l'ouverture et ne le réinitialise pas correctement quand `open` est
  // piloté par notre propre état plutôt que par <Drawer.Trigger>
  // (voir https://github.com/emilkowalski/vaul/issues/509 et /issues/534).
  // Sans ce correctif, la carte et la barre de recherche deviennent
  // injoignables dès que le panneau est ouvert.
  useEffect(() => {
    if (!point) return;
    const resetPointerEvents = () => {
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    };
    resetPointerEvents();
    const observer = new MutationObserver(resetPointerEvents);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [point]);

  useEffect(() => {
    if (isDesktop) {
      onSheetHeightChange(0);
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

  const totalSources =
    tab === "projet" ? point.sources.length : promoter.sources.length;
  const BannerIcon = STATUS_ICONS[point.status];

  // Renvoi croisé : d'autres projets du même promoteur ont-ils un statut
  // différent (potentiellement pire) que celui affiché ici ?
  const riskRank: Record<Point["status"], number> = { agree: 0, rumeur: 1, confirme: 2 };
  const worseElsewhere = otherPointsFromPromoter.filter(
    (p) => riskRank[p.status] > riskRank[point.status]
  );

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

          {/* Bandeau de statut — l'info la plus importante du produit,
              toujours la plus visible, quel que soit l'onglet. Fond teinté
              pastel + icône/texte de la même teinte foncée, jamais un aplat
              saturé : c'est le traitement "épuré" façon Apple Health/Wallet,
              pas un bloc de couleur criard. La couleur pleine reste
              réservée aux petits éléments (points sur la carte). */}
          <div
            className={cn(
              "mx-4 mt-4 flex items-start gap-2.5 rounded-2xl px-4 py-3",
              STATUS_SOFT_CLASS[point.status]
            )}
          >
            <BannerIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                {STATUS_LABELS[point.status]}
                {point.issue_category && (
                  <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-medium dark:bg-white/15">
                    {ISSUE_CATEGORY_LABELS[point.issue_category]}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs leading-snug opacity-90">{point.summary}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le panneau"
              className="ml-auto hidden h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 md:flex"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Renvoi croisé : ce promoteur a un autre projet plus préoccupant
              ailleurs — l'info qu'un profil "propre" en façade ne doit pas
              cacher. */}
          {worseElsewhere.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectOtherPoint(worseElsewhere[0])}
              className="mx-4 mt-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-left text-xs text-amber-800 hover:bg-amber-100 dark:bg-amber-400/10 dark:text-amber-300 dark:hover:bg-amber-400/20"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="flex-1">
                {promoter.name} a {worseElsewhere.length > 1 ? "d'autres projets" : "un autre projet"}{" "}
                marqué{worseElsewhere.length > 1 ? "s" : ""}{" "}
                <strong>{STATUS_LABELS[worseElsewhere[0].status]}</strong> ailleurs
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </button>
          )}

          <div className="flex-1 overflow-y-auto px-6 pb-8 pt-4">
            {/* En-tête nom + preuve visible d'un coup d'œil */}
            <div className="mb-3">
              <h1 className="text-xl font-semibold leading-tight">
                {tab === "projet" ? point.name : promoter.name}
              </h1>
              <p className="mt-0.5 text-sm text-neutral-500">
                {tab === "projet" ? `Promoteur ${promoter.name}` : `${promoter.quartier}`}
              </p>
              <p className="mt-1.5 text-xs text-neutral-400">
                {totalSources} source{totalSources > 1 ? "s" : ""} vérifiable
                {totalSources > 1 ? "s" : ""} · {formatLastVerified(point.last_verified)}
              </p>
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

            {/* Deux photos côte à côte : le projet, puis le promoteur */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <PhotoTile src={point.project_photo_url} alt={point.name} />
              <PhotoTile src={promoter.photo_url} alt={promoter.name} rounded />
            </div>

            {/* Onglets — Ce projet / Promoteur */}
            <div className="mb-4 flex gap-5 border-b border-black/10 dark:border-white/10">
              <TabButton active={tab === "projet"} onClick={() => setTab("projet")}>
                Ce projet
              </TabButton>
              <TabButton active={tab === "promoteur"} onClick={() => setTab("promoteur")}>
                Historique du promoteur
              </TabButton>
            </div>

            {tab === "projet" ? (
              <>
                <AboutCard title={`À propos de ${point.name}`} bullets={[point.summary]} />
                <SourcesList sources={point.sources} />
              </>
            ) : (
              <>
                {promoter.registration_number && (
                  <p className="mb-4 flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2 text-xs text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Immatriculation : {promoter.registration_number}
                  </p>
                )}
                <AboutCard title={`À propos de ${promoter.name}`} bullets={promoter.about} />
                {otherPointsFromPromoter.length > 0 && (
                  <OtherProjects points={otherPointsFromPromoter} onSelect={onSelectOtherPoint} />
                )}
                <SourcesList sources={promoter.sources} />
              </>
            )}

            <a
              href={`mailto:contact@eclaireurmap.com?subject=${encodeURIComponent(
                `Signalement — ${tab === "projet" ? point.name : promoter.name}`
              )}`}
              className="mt-6 flex items-center justify-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            >
              <Flag className="h-3.5 w-3.5" aria-hidden />
              Signaler une erreur ou une information manquante
            </a>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function PhotoTile({ src, alt, rounded }: { src: string; alt: string; rounded?: boolean }) {
  return (
    <div
      className={cn(
        "relative aspect-[4/3] overflow-hidden bg-neutral-200 dark:bg-neutral-800",
        rounded ? "rounded-2xl" : "rounded-2xl"
      )}
    >
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

function OtherProjects({
  points,
  onSelect
}: {
  points: Point[];
  onSelect: (point: Point) => void;
}) {
  return (
    <div className="mb-5">
      <h2 className="mb-2 text-sm font-semibold text-neutral-500">Autres projets de ce promoteur</h2>
      <ul className="space-y-1.5">
        {points.map((p) => {
          const Icon = STATUS_ICONS[p.status];
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p)}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    STATUS_SOFT_CLASS[p.status]
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-neutral-500">{STATUS_LABELS[p.status]}</span>
              </button>
            </li>
          );
        })}
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
                  <span className="text-xs font-normal text-neutral-400">({group.items.length})</span>
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