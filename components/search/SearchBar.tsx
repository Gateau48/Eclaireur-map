"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { cn, normalize } from "@/lib/utils";
import type { Point, ZoneData } from "@/lib/data/schema";

export interface SearchResult {
  point: Point;
  zoneName: string;
}

interface SearchBarProps {
  zones: ZoneData[];
  onSelect: (result: SearchResult) => void;
}

const DEBOUNCE_MS = 180;

export function SearchBar({ zones, onSelect }: SearchBarProps) {
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce obligatoire (150-200ms) — Partie 2.4 du brief.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(rawQuery), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const results = useMemo<SearchResult[]>(() => {
    const q = normalize(debouncedQuery);
    if (!q) return [];
    const all: SearchResult[] = zones.flatMap((zone) =>
      zone.points.map((point) => ({ point, zoneName: zone.zone_name }))
    );
    // Filtre sur name ET zone_name (Partie 2.4).
    return all
      .filter(
        ({ point, zoneName }) =>
          normalize(point.name).includes(q) || normalize(zoneName).includes(q)
      )
      .slice(0, 20);
  }, [debouncedQuery, zones]);

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
      {/* Champ flottant, visible en permanence — se transforme en plein écran
          sur mobile au focus (voir ci-dessous). Partie 4, Couche 1. */}
      <div
        className={cn(
          "glass absolute left-1/2 top-4 z-10 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-full",
          isFocused && "md:block hidden" // sur mobile, remplacé par l'overlay plein écran
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
            placeholder="Chercher un promoteur ou un quartier"
            className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
        </label>

        {isFocused && results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto border-t border-black/10 py-1 dark:border-white/10">
            {results.map((r) => (
              <ResultRow key={r.point.id} result={r} onSelect={handleSelect} />
            ))}
          </ul>
        )}
      </div>

      {/* Overlay plein écran, mobile uniquement — Partie 5 : "au tap sur le
          champ, la recherche passe en plein écran". */}
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
              placeholder="Chercher un promoteur ou un quartier"
              className="w-full bg-transparent text-base outline-none placeholder:text-neutral-500"
            />
          </div>
          <ul className="flex-1 overflow-y-auto py-1">
            {results.map((r) => (
              <ResultRow key={r.point.id} result={r} onSelect={handleSelect} />
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

function ResultRow({
  result,
  onSelect
}: {
  result: SearchResult;
  onSelect: (r: SearchResult) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(result)}
        className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-black/5 dark:hover:bg-white/10"
      >
        <span className="text-sm font-medium">{result.point.name}</span>
        <span className="text-xs text-neutral-500">{result.zoneName}</span>
      </button>
    </li>
  );
}
