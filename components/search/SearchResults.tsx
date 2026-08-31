'use client';

import { useRef, useEffect } from 'react';
import type { Point } from '@/lib/data/types';
import Badge from '@/components/ui/Badge';

interface SearchResultsProps {
  results: Point[];
  selectedIndex: number;
  onSelect: (point: Point) => void;
}

export default function SearchResults({ results, selectedIndex, onSelect }: SearchResultsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <div
      ref={listRef}
      className="absolute top-full left-0 right-0 mt-2 glass rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto"
    >
      {results.map((point, index) => (
        <button
          key={point.id}
          onClick={() => onSelect(point)}
          className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors
                     hover:bg-white/10 min-h-[56px]
                     ${index === selectedIndex ? 'bg-white/10' : ''}
                     ${index > 0 ? 'border-t border-white/5' : ''}`}
        >
          {/* Status dot */}
          <span
            className={`w-3 h-3 rounded-full flex-shrink-0 ${
              point.status === 'agree'
                ? 'bg-[var(--status-agree-text)]'
                : point.status === 'rumeur'
                ? 'bg-[var(--status-rumeur-text)]'
                : 'bg-[var(--status-confirme-text)]'
            }`}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{point.name}</div>
            <div className="text-xs opacity-50 truncate mt-0.5">{point.type}</div>
          </div>

          {/* Badge */}
          <Badge status={point.status} size="sm" />
        </button>
      ))}
    </div>
  );
}
