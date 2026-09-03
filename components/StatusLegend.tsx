"use client";

import { PROJECT_PHASE_LABELS, type ProjectPhase } from "@/lib/schema";
import { PHASE_SOLID_CLASS } from "@/lib/status";
import { cn } from "@/lib/utils";

const VISIBLE_PHASES: ProjectPhase[] = [
  "annonce",
  "commercialisation",
  "en_construction",
  "livre",
  "suspendu"
];

export function StatusLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "glass rounded-2xl px-3 py-2 text-xs shadow-md",
        "hidden md:block",
        className
      )}
    >
      <ul className="space-y-1">
        {VISIBLE_PHASES.map((phase) => (
          <li key={phase} className="flex items-center gap-2">
            <span className={cn("inline-block size-2.5 rounded-full", PHASE_SOLID_CLASS[phase])} />
            <span className="text-neutral-600 dark:text-neutral-300">{PROJECT_PHASE_LABELS[phase]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
