"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_CRITERIA, STATUS_ICONS, STATUS_ICON_CLASS, STATUS_LABELS } from "@/lib/status";
import type { Point } from "@/lib/schema";

const ORDER: Point["status"][] = ["agree", "rumeur", "confirme"];

export function StatusLegend({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Comment lire les couleurs de la carte"
        aria-expanded={open}
        className="glass flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 md:h-9 md:w-9"
      >
        <Info className="h-4 w-4" aria-hidden />
      </button>

      {open && (
        <div className="glass absolute bottom-14 left-0 w-[calc(100vw-2rem)] max-w-xs rounded-2xl p-4 md:bottom-12">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold">Comment lire les couleurs</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          <ul className="space-y-3">
            {ORDER.map((status) => {
              const Icon = STATUS_ICONS[status];
              return (
                <li key={status} className="flex gap-2.5">
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", STATUS_ICON_CLASS[status])} aria-hidden />
                  <div>
                    <p className="text-xs font-semibold">{STATUS_LABELS[status]}</p>
                    <p className="mt-0.5 text-xs leading-snug text-neutral-500">
                      {STATUS_CRITERIA[status]}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 border-t border-black/10 pt-3 text-[11px] leading-snug text-neutral-400 dark:border-white/10">
            Ce n&rsquo;est pas un classement : chaque projet est évalué contre ces critères
            indépendamment des autres, jamais comparé à eux.
          </p>
        </div>
      )}
    </div>
  );
}