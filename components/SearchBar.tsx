"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, MapPin, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchApiResult } from "@/app/api/search/[edition]/route";

interface SearchBarProps {
  editionId: string;
  onSelect: (result: SearchApiResult) => void;
  /** Masqué quand le panneau est en plein écran — comme Google Maps, où la
   *  barre de recherche disparaît une fois la fiche pleinement dépliée. */
  hidden?: boolean;
}

const DEBOUNCE_MS = 200;

export function SearchBar({ editionId, onSelect, hidden }: SearchBarProps) {
  const [rawQuery, setRawQuery] = useState("");
  const [results, setResults] = useState<SearchApiResult[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const query = rawQuery.trim();
    if (!query) {
      setResults([]);
      return;
    }
    const thisRequestId = ++requestIdRef.current;
    const t = setTimeout(() => {
      fetch(`/api/search/${editionId}?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          // Ignore les réponses obsolètes (une frappe plus récente a déjà
          // relancé une requête) pour éviter un flash de résultats périmés.
          if (thisRequestId === requestIdRef.current) setResults(data.results ?? []);
        })
        .catch(() => {
          if (thisRequestId === requestIdRef.current) setResults([]);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawQuery, editionId]);

  const hasDropdown = isFocused && (results.length > 0 || rawQuery.trim().length > 0);

  function handleSelect(result: SearchApiResult) {
    onSelect(result);
    setRawQuery("");
    setResults([]);
    setIsFocused(false);
    inputRef.current?.blur();
  }

  function close() {
    setIsFocused(false);
    setRawQuery("");
    setResults([]);
    inputRef.current?.blur();
  }

  return (
    <>
      {/* Champ flottant desktop/tablette. GARDE-FOU visuel : `rounded-full`
          uniquement quand REPLIÉ (pas de liste sous le champ) — sinon,
          faire tenir une liste de hauteur variable dans un conteneur
          "pilule" force des coins totalement ronds à s'étirer de façon
          disgracieuse (le bug "ça devient gros et mince"). On passe à des
          coins plus classiques dès qu'une liste apparaît, comme le fait
          Google Maps. */}
      <div
        className={cn(
          "glass absolute left-1/2 top-4 z-10 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 overflow-hidden",
          "transition-[border-radius,box-shadow] duration-150",
          hasDropdown ? "rounded-3xl" : "rounded-full",
          "focus-within:shadow-lg",
          hidden && "pointer-events-none opacity-0 md:pointer-events-auto md:opacity-100",
          isFocused && "hidden md:block"
        )}
      >
        <label className="relative flex items-center gap-2 px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Chercher un promoteur ou un projet"
            // GARDE-FOU : border-0 + outline-none + bg-transparent explicites
            // sur l'input lui-même — certains navigateurs posent un contour
            // par défaut sur <input> qui restait visible en permanence,
            // indépendamment du focus. L'indication de focus vit uniquement
            // sur le conteneur (focus-within:shadow-lg ci-dessus).
            className="w-full border-0 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-500 dark:text-white"
          />
        </label>

        {hasDropdown && (
          <ul className="max-h-80 overflow-y-auto border-t border-black/10 py-1 dark:border-white/10">
            {results.map((r) => (
              <ResultRow key={resultKey(r)} result={r} onSelect={handleSelect} />
            ))}
            {rawQuery.trim() && results.length === 0 && (
              <li className="px-4 py-3 text-center text-sm text-neutral-500">Aucun résultat</li>
            )}
          </ul>
        )}
      </div>

      {/* Overlay plein écran, mobile uniquement — comme Google Maps. */}
      {isFocused && (
        <div className="fixed inset-0 z-40 flex flex-col bg-white dark:bg-neutral-950 md:hidden">
          <div className="flex items-center gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
            <button
              type="button"
              onClick={close}
              aria-label="Fermer la recherche"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <input
              autoFocus
              type="text"
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder="Chercher un promoteur ou un projet"
              className="w-full border-0 bg-transparent text-base text-neutral-900 outline-none placeholder:text-neutral-500 dark:text-white"
            />
          </div>
          <ul className="flex-1 overflow-y-auto py-1">
            {results.map((r) => (
              <ResultRow key={resultKey(r)} result={r} onSelect={handleSelect} />
            ))}
            {rawQuery.trim() && results.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-neutral-500">
                Aucun résultat pour « {rawQuery} »
              </li>
            )}
          </ul>
        </div>
      )}
    </>
  );
}

function resultKey(r: SearchApiResult) {
  return r.kind === "project" ? `project-${r.projectId}` : `promoter-${r.promoterId}`;
}

function ResultRow({
  result,
  onSelect
}: {
  result: SearchApiResult;
  onSelect: (r: SearchApiResult) => void;
}) {
  const subtitle =
    result.kind === "project"
      ? [result.promoterName, result.district].filter(Boolean).join(" · ")
      : `Promoteur${result.district ? ` · ${result.district}` : ""}`;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(result)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-black/5 dark:hover:bg-white/10"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {result.kind === "project" ? (
            <MapPin className="h-4 w-4" aria-hidden />
          ) : (
            <User className="h-4 w-4" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-neutral-900 dark:text-white">
            {result.name}
          </span>
          {subtitle && <span className="block truncate text-xs text-neutral-500">{subtitle}</span>}
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
      </button>
    </li>
  );
}