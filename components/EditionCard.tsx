'use client';

import Link from 'next/link';
import type { Edition } from '@/lib/data/types';

interface EditionCardProps {
  edition: Edition;
  owned: boolean;
}

export default function EditionCard({ edition, owned }: EditionCardProps) {
  return (
    <Link href={owned ? `/${edition.slug}` : `/${edition.slug}/vente`}>
      <div className="relative rounded-3xl overflow-hidden aspect-[4/3] group cursor-pointer transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl bg-neutral-100 dark:bg-neutral-800">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 text-white font-semibold text-lg">
          {edition.name}
        </div>
        {owned ? (
          <span className="absolute top-4 right-4 px-3 py-1 text-xs font-medium bg-white/20 backdrop-blur-sm text-white rounded-full border border-white/30">
            Débloqué
          </span>
        ) : (
          <button className="absolute top-4 right-4 px-3 py-1 text-xs font-medium bg-white text-neutral-900 rounded-full hover:bg-white/90 transition-colors">
            Débloquer
          </button>
        )}
      </div>
    </Link>
  );
}
