'use client';

import { Drawer } from 'vaul';
import type { Point } from '@/lib/data/types';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import { cn } from '@/lib/utils/cn';
import Badge from '@/components/ui/Badge';
import SourceBadge from './SourceBadge';

interface DetailPanelProps {
  point: Point | null;
  onClose: () => void;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function PanelContent({ point, onClose }: { point: Point; onClose: () => void }) {
  return (
    <div className="p-6 h-full overflow-y-auto">
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
    </div>
  );
}

export default function DetailPanel({ point, onClose }: DetailPanelProps) {
  const isMobile = useIsMobile();
  const isOpen = point !== null;

  if (isMobile) {
    return (
      <Drawer.Root
        open={isOpen}
        onOpenChange={(open) => { if (!open) onClose(); }}
        direction="bottom"
        snapPoints={[0.15, 0.5, 0.92]}
        modal={false}
      >
        <Drawer.Portal>
          <Drawer.Content
            className={cn(
              'fixed z-20 bottom-0 left-0 right-0',
              'bg-white/65 dark:bg-neutral-900/65 backdrop-blur-2xl backdrop-saturate-150',
              'border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
              'rounded-t-[28px]',
            )}
          >
            <Drawer.Handle className="mx-auto mt-2 h-1 w-9 rounded-full bg-neutral-300" />
            {point && <PanelContent point={point} onClose={onClose} />}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <div
      className={cn(
        'hidden md:block transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0',
        isOpen ? 'w-[400px]' : 'w-0',
      )}
    >
      <div
        className={cn(
          'w-[400px] h-full',
          'bg-white/65 dark:bg-neutral-900/65 backdrop-blur-2xl backdrop-saturate-150',
          'border-r border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
        )}
      >
        {point && <PanelContent point={point} onClose={onClose} />}
      </div>
    </div>
  );
}
