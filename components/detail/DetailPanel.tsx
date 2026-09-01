'use client';

import { useEffect, useRef, useState } from 'react';
import type { Point } from '@/lib/data/types';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import { cn } from '@/lib/utils/cn';
import Badge from '@/components/ui/Badge';
import SourceBadge from './SourceBadge';

interface DetailPanelProps {
  point: Point | null;
  onClose: () => void;
}

export default function DetailPanel({ point, onClose }: DetailPanelProps) {
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    setTranslateY(0);
  }, [point]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setDragStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isMobile) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - dragStartY;
    if (diff > 0) {
      setTranslateY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || !isMobile) return;
    setIsDragging(false);
    if (translateY > 100) {
      onClose();
    } else {
      setTranslateY(0);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const isOpen = point !== null;

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed z-20 bg-white/70 backdrop-blur-xl border border-white/30',
        'shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]',
        'transition-transform duration-300 ease-out',
        'inset-x-0 bottom-0 h-[70vh] rounded-t-[28px]',
        'md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:h-full md:w-[400px] md:rounded-l-[28px] md:rounded-t-none',
        !isDragging && (isOpen
          ? 'translate-y-0 md:translate-x-0'
          : 'translate-y-full md:translate-x-full')
      )}
      style={{
        transform: isDragging
          ? `translateY(${translateY}px)`
          : undefined,
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
      onClick={handleOverlayClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag handle - mobile */}
      <div className="flex justify-center py-3 md:hidden">
        <div className="w-10 h-1 rounded-full bg-black/10" />
      </div>

      <div className="p-6 h-full overflow-y-auto">
        {point && (
          <>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold leading-tight">{point.name}</h2>
                <p className="text-sm opacity-60 mt-1 capitalize">{point.type}</p>
              </div>
              <button
                onClick={onClose}
                className="ml-4 p-2 rounded-full hover:bg-black/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Fermer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <Badge status={point.status} size="lg" />
            </div>

            <div className="mb-6">
              <p className="text-sm leading-relaxed">{point.summary}</p>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium opacity-70 mb-3">Sources</h3>
              <div className="space-y-3">
                {point.sources.map((source, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-black/5 border border-black/5"
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <SourceBadge type={source.type} />
                    </div>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline block mb-1"
                    >
                      {source.title}
                    </a>
                    <p className="text-xs opacity-50">{formatDate(source.date)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs opacity-40 border-t border-black/10 pt-4">
              Vérifié le {formatDate(point.last_verified)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
