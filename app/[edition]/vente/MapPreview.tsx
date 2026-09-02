"use client";

import { MapPin } from "lucide-react";

export function MapPreview() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-neutral-100 shadow-hero dark:border-white/10 dark:bg-neutral-800">
      <div className="aspect-[16/9] w-full bg-gradient-to-br from-teal-50 via-white to-amber-50 dark:from-teal-900/30 dark:via-neutral-900 dark:to-amber-900/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute -inset-6 animate-pulse rounded-full bg-teal-400/20" />
            <MapPin className="relative h-10 w-10 text-teal-600 dark:text-teal-400" />
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
          <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-medium text-white shadow-sm">
            3 projets agréés
          </span>
          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-medium text-white shadow-sm">
            2 en rumeur
          </span>
          <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white shadow-sm">
            1 confirmé
          </span>
        </div>
      </div>
    </div>
  );
}
