"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, CircleX, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchApiResult } from "@/app/api/search/[edition]/route";

interface SearchBarProps {
  editionId: string;
  onSelect: (result: SearchApiResult) => void;
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
          if (thisRequestId === requestIdRef.current)
            setResults(data.results ?? []);
        })
        .catch(() => {
          if (thisRequestId === requestIdRef.current) setResults([]);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawQuery, editionId]);

  const hasDropdown =
    isFocused && (results.length > 0 || rawQuery.trim().length > 0);

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
      <div
        className={cn(
          "absolute left-1/2 top-4 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 overflow-hidden bg-white shadow-lg",
          "transition-[border-radius,box-shadow] duration-150",
          hasDropdown ? "rounded-3xl" : "rounded-full",
          "focus-within:shadow-xl",
          hidden &&
            "pointer-events-none opacity-0 md:pointer-events-auto md:opacity-100",
          isFocused && "hidden md:block"
        )}
      >
        <label className="relative flex items-center gap-2 px-4 py-2.5">
          <MapPin className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Rechercher ici"
            className="w-full border-0 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-500"
          />
          {rawQuery && (
            <button
              type="button"
              onClick={() => {
                setRawQuery("");
                setResults([]);
              }}
              aria-label="Effacer"
              className="shrink-0 rounded-full p-0.5 hover:bg-neutral-100"
            >
              <CircleX className="h-4 w-4 text-neutral-400" />
            </button>
          )}
        </label>

        {hasDropdown && (
          <ul className="max-h-80 overflow-y-auto border-t border-neutral-100 py-1">
            {results.map((r) => (
              <ResultRow
                key={resultKey(r)}
                result={r}
                onSelect={handleSelect}
              />
            ))}
            {rawQuery.trim() && results.length === 0 && (
              <li className="px-4 py-3 text-center text-sm text-neutral-500">
                Aucun résultat
              </li>
            )}
          </ul>
        )}
      </div>

      {isFocused && (
        <div className="fixed inset-0 z-40 flex flex-col bg-white md:hidden">
          <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
            <button
              type="button"
              onClick={close}
              aria-label="Fermer la recherche"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <input
              autoFocus
              type="text"
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder="Rechercher ici"
              className="w-full border-0 bg-transparent text-base text-neutral-900 outline-none placeholder:text-neutral-500"
            />
          </div>
          <ul className="flex-1 overflow-y-auto py-1">
            {results.map((r) => (
              <ResultRow
                key={resultKey(r)}
                result={r}
                onSelect={handleSelect}
              />
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
  return r.kind === "project"
    ? `project-${r.projectId}`
    : `promoter-${r.promoterId}`;
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
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
          {result.kind === "project" ? (
            <MapPin className="h-4 w-4" aria-hidden />
          ) : (
            <User className="h-4 w-4" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-neutral-900">
            {result.name}
          </span>
          {subtitle && (
            <span className="block truncate text-xs text-neutral-500">
              {subtitle}
            </span>
          )}
        </span>
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-neutral-400"
          aria-hidden
        />
      </button>
    </li>
  );
}
