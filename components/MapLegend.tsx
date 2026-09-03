"use client";

import { cn } from "@/lib/utils";
import { PHASE_MARKER_COLOR } from "@/lib/status";
import { PROJECT_PHASE_LABELS, type ProjectPhase } from "@/lib/schema";

const LEGEND_ITEMS: { phase: ProjectPhase; color: string }[] = [
  { phase: "annonce", color: PHASE_MARKER_COLOR.annonce },
  { phase: "commercialisation", color: PHASE_MARKER_COLOR.commercialisation },
  { phase: "en_construction", color: PHASE_MARKER_COLOR.en_construction },
  { phase: "livre", color: PHASE_MARKER_COLOR.livre },
  { phase: "suspendu", color: PHASE_MARKER_COLOR.suspendu }
];

export function MapLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-x-3 gap-y-1 rounded-xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      {LEGEND_ITEMS.map(({ phase, color }) => (
        <span key={phase} className="flex items-center gap-1.5 text-[10px] text-neutral-600">
          <span className={cn("inline-block h-2.5 w-2.5 rounded-full", color)} />
          {PROJECT_PHASE_LABELS[phase]}
        </span>
      ))}
    </div>
  );
}
