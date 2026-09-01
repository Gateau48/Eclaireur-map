'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Point, Zone } from '@/lib/data/types';
import { normalize } from '@/lib/utils/normalize';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import SearchResults from './SearchResults';

interface SearchBarProps {
  data: Zone;
  onPointSelect: (point: Point) => void;
}

export default function SearchBar({ data, onPointSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Point[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const normalizedZoneName = useMemo(() => normalize(data.zone_name), [data.zone_name]);

  const search = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }
      const normalizedQuery = normalize(searchQuery);
      const matched = data.points.filter(
        (point) =>
          normalize(point.name).includes(normalizedQuery) ||
          normalizedZoneName.includes(normalizedQuery)
      );
      setResults(matched);
      setSelectedIndex(-1);
    },
    [data.points, normalizedZoneName]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (point: Point) => {
    onPointSelect(point);
    setQuery(point.name);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    setIsFocused(true);
    setIsOpen(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleClose = () => {
    setIsFocused(false);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  if (isMobile && isFocused) {
    return (
      <div className="fixed inset-0 z-40 bg-white dark:bg-neutral-900 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-black/10 dark:border-white/10">
          <button
            onClick={handleClose}
            className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Retour"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={`Rechercher dans ${data.zone_name}...`}
              className="w-full pl-10 pr-4 py-3 bg-black/5 dark:bg-white/5 rounded-xl text-sm focus:outline-none min-h-[44px]"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isOpen && results.length > 0 && (
            <SearchResults
              results={results}
              selectedIndex={selectedIndex}
              onSelect={handleSelect}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative z-10">
      <div className="glass rounded-2xl overflow-hidden">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={`Rechercher dans ${data.zone_name}...`}
            className="w-full pl-12 pr-4 py-3.5 bg-transparent focus:outline-none text-sm placeholder-white/40 min-h-[44px]"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
              aria-label="Effacer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {isOpen && results.length > 0 && (
        <SearchResults
          results={results}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
