"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, MapPin, Search, User } from "lucide-react";
import { cn, normalize } from "@/lib/utils";
import type { EditionData, Project, Promoter } from "@/lib/schema";

export type SearchResult =
  | { kind: "projet"; project: Project; promoter: Promoter }
  | { kind: "promoteur"; promoter: Promoter };

interface SearchBarProps {
  edition: EditionData;
  onSelect: (result: SearchResult) => void;
}

const DEBOUNCE_MS = 180;

function buildIndex(edition: EditionData): SearchResult[] {
  const results: SearchResult[] = [];
  for (const promoter of edition.promoters) {
    results.push({ kind: "promoteur", promoter });
    for (const project of promoter.projects) {
      results.push({ kind: "projet", project, promoter });
    }
  }
  return results;
}

export function SearchBar({ edition, onSelect }: SearchBarProps) {
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(rawQuery), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const index = useMemo(() => buildIndex(edition), [edition]);

  const results = useMemo(() => {
    const q = normalize(debouncedQuery);
    if (!q) return [];
    return index
      .filter((r) => {
        if (r.kind === "projet") {
          return (
            normalize(r.project.name).includes(q) ||
            normalize(r.project.location.city).includes(q) ||
            normalize(r.promoter.name).includes(q)
          );
        }
        return normalize(r.promoter.name).includes(q);
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
      <div
        className={cn(
          "glass absolute left-1/2 top-4 z-10 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-full",
          "transition-shadow focus-within:ring-2 focus-within:ring-teal-500/60",
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
  return r.kind === "projet" ? `projet-${r.project.id}` : `promoteur-${r.promoter.id}`;
}

function ResultRow({
  result,
  onSelect
}: {
  result: SearchResult;
  onSelect: (r: SearchResult) => void;
}) {
  const title = result.kind === "projet" ? result.project.name : result.promoter.name;
  const subtitle =
    result.kind === "projet"
      ? `${result.promoter.name} · ${result.project.location.city}`
      : `${result.promoter.projects.length} projet(s)`;

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
