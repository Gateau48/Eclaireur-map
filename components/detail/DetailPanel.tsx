'use client';

import { useEffect, useRef, useState } from 'react';
import type { Point } from '@/lib/data/types';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
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

  // Reset state when point changes
  useEffect(() => {
    setTranslateY(0);
  }, [point]);

  // Handle swipe down to close on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setDragStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isMobile) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - dragStartY;
    // Only allow swiping down
    if (diff > 0) {
      setTranslateY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || !isMobile) return;
    setIsDragging(false);
    // Close if swiped down more than 100px
    if (translateY > 100) {
      onClose();
    } else {
      setTranslateY(0);
    }
  };

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!point) return null;

  // Format date
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

  // Mobile bottom sheet
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/30"
        onClick={handleOverlayClick}
      >
        <div
          ref={panelRef}
          className="absolute bottom-0 left-0 right-0 glass rounded-t-3xl overflow-hidden"
          style={{
            maxHeight: '80vh',
            transform: `translateY(${translateY}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag handle */}
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>

          {/* Content */}
          <div className="px-6 pb-8 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
            <DetailContent point={point} formatDate={formatDate} onClose={onClose} />
          </div>
        </div>
      </div>
    );
  }

  // Desktop side panel
  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex"
      onClick={handleOverlayClick}
    >
      <div className="flex-1" />
      <div
        ref={panelRef}
        className="w-[380px] glass overflow-y-auto side-panel-enter"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="p-6">
          <DetailContent point={point} formatDate={formatDate} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

function DetailContent({
  point,
  formatDate,
  onClose,
}: {
  point: Point;
  formatDate: (date: string) => string;
  onClose: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold leading-tight">{point.name}</h2>
          <p className="text-sm opacity-60 mt-1 capitalize">{point.type}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 p-2 rounded-full hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Fermer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Status badge */}
      <div className="mb-6">
        <Badge status={point.status} size="lg" />
      </div>

      {/* Summary */}
      <div className="mb-6">
        <h3 className="text-sm font-medium opacity-70 mb-2">Résumé</h3>
        <p className="text-sm leading-relaxed">{point.summary}</p>
      </div>

      {/* Sources */}
      <div className="mb-6">
        <h3 className="text-sm font-medium opacity-70 mb-3">Sources</h3>
        <div className="space-y-3">
          {point.sources.map((source, index) => (
            <div
              key={index}
              className="p-3 rounded-xl bg-white/5 border border-white/10"
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

      {/* Last verified */}
      <div className="text-xs opacity-40 border-t border-white/10 pt-4">
        Dernière vérification : {formatDate(point.last_verified)}
      </div>
    </>
  );
}
