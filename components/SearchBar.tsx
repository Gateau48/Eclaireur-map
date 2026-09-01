"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, MapPin, Search, User } from "lucide-react";
import { cn, normalize } from "@/lib/utils";
import type { Point, Promoter, ZoneData } from "@/lib/schema";

export type SearchResult =
  | { kind: "projet"; point: Point; promoter: Promoter; zoneName: string }
  | { kind: "promoteur"; promoter: Promoter; primaryPoint: Point; zoneName: string };

interface SearchBarProps {
  zones: ZoneData[];
  onSelect: (result: SearchResult) => void;
}

const DEBOUNCE_MS = 180;

function buildIndex(zones: ZoneData[]): SearchResult[] {
  const results: SearchResult[] = [];
  for (const zone of zones) {
    for (const promoter of zone.promoters) {
      const primaryPoint = zone.points.find((p) => p.promoter_id === promoter.id);
      if (primaryPoint) {
        results.push({ kind: "promoteur", promoter, primaryPoint, zoneName: zone.zone_name });
      }
    }
    for (const point of zone.points) {
      const promoter = zone.promoters.find((p) => p.id === point.promoter_id);
      if (promoter) {
        results.push({ kind: "projet", point, promoter, zoneName: zone.zone_name });
      }
    }
  }
  return results;
}

export function SearchBar({ zones, onSelect }: SearchBarProps) {
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce obligatoire (150-200ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(rawQuery), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const index = useMemo(() => buildIndex(zones), [zones]);

  const results = useMemo(() => {
    const q = normalize(debouncedQuery);
    if (!q) return [];
    return index
      .filter((r) => {
        const name = r.kind === "projet" ? r.point.name : r.promoter.name;
        return (
          normalize(name).includes(q) ||
          normalize(r.zoneName).includes(q) ||
          normalize(r.promoter.name).includes(q)
        );
      })
      .slice(0, 20);
  }, [debouncedQuery, index]);

  function handleSelect(result: SearchResult) {
    onSelect(result);
    setRawQuery("");
    setDebouncedQuery("");
    setIsFocused(false);
    inputRef.current?.blur();
  }

  function close() {
    setIsFocused(false);
    setRawQuery("");
    setDebouncedQuery("");
    inputRef.current?.blur();
  }

  return (
    <>
      {/* Champ flottant desktop/tablette — remplacé par l'overlay plein
          écran ci-dessous sur mobile au focus. */}
      <div
        className={cn(
          "glass absolute left-1/2 top-4 z-10 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-full",
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
            className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
        </label>

        {isFocused && results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto border-t border-black/10 py-1 dark:border-white/10">
            {results.map((r) => (
              <ResultRow key={resultKey(r)} result={r} onSelect={handleSelect} />
            ))}
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
              className="w-full bg-transparent text-base outline-none placeholder:text-neutral-500"
            />
          </div>
          <ul className="flex-1 overflow-y-auto py-1">
            {results.map((r) => (
              <ResultRow key={resultKey(r)} result={r} onSelect={handleSelect} />
            ))}
            {debouncedQuery && results.length === 0 && (
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

function resultKey(r: SearchResult) {
  return r.kind === "projet" ? `projet-${r.point.id}` : `promoteur-${r.promoter.id}`;
}

function ResultRow({
  result,
  onSelect
}: {
  result: SearchResult;
  onSelect: (r: SearchResult) => void;
}) {
  const title = result.kind === "projet" ? result.point.name : result.promoter.name;
  const subtitle =
    result.kind === "projet" ? `Promoteur ${result.promoter.name}` : `Promoteur · ${result.zoneName}`;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(result)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-black/5 dark:hover:bg-white/10"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {result.kind === "projet" ? (
            <MapPin className="h-4 w-4" aria-hidden />
          ) : (
            <User className="h-4 w-4" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-neutral-500">{subtitle}</span>
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
      </button>
    </li>
  );
}
