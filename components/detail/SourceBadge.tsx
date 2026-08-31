import type { SourceType } from '@/lib/data/types';

interface SourceBadgeProps {
  type: SourceType;
}

const typeConfig: Record<SourceType, { icon: string; label: string }> = {
  presse: { icon: '📰', label: 'Presse' },
  justice: { icon: '⚖️', label: 'Justice' },
  officiel: { icon: '🏛️', label: 'Officiel' },
};

export default function SourceBadge({ type }: SourceBadgeProps) {
  const config = typeConfig[type];

  return (
    <span
      className="inline-flex items-center gap-1 text-xs opacity-70"
      title={config.label}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
