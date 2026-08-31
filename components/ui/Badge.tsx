import type { Status } from '@/lib/data/types';

interface BadgeProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<Status, { label: string; bgClass: string }> = {
  agree: {
    label: 'Agréé',
    bgClass: 'bg-[var(--status-agree-bg)] border-[var(--status-agree-border)] text-[var(--status-agree-text)]',
  },
  rumeur: {
    label: 'Rumeur',
    bgClass: 'bg-[var(--status-rumeur-bg)] border-[var(--status-rumeur-border)] text-[var(--status-rumeur-text)]',
  },
  confirme: {
    label: 'Confirmé',
    bgClass: 'bg-[var(--status-confirme-bg)] border-[var(--status-confirme-border)] text-[var(--status-confirme-text)]',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export default function Badge({ status, size = 'md' }: BadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.bgClass} ${sizeClasses[size]}`}
    >
      <span
        className={`w-2 h-2 rounded-full mr-1.5 ${
          status === 'agree'
            ? 'bg-[var(--status-agree-text)]'
            : status === 'rumeur'
            ? 'bg-[var(--status-rumeur-text)]'
            : 'bg-[var(--status-confirme-text)]'
        }`}
      />
      {config.label}
    </span>
  );
}
