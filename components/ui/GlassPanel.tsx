import type { ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'aside' | 'section';
}

export default function GlassPanel({
  children,
  className = '',
  as: Component = 'div',
}: GlassPanelProps) {
  return (
    <Component
      className={`glass rounded-3xl ${className}`}
    >
      {children}
    </Component>
  );
}
