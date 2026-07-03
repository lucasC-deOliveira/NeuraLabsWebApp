"use client";

import { CONFIDENCE_LABELS } from "../study-phase";

export function ConfidencePicker({ onPick }: { onPick: (level: number) => void }) {
  return (
    <div className="mt-4 sm:mt-6">
      <label className="mb-1.5 sm:mb-2 block text-center text-xs sm:text-sm font-medium text-muted-foreground">
        Quão confiante você estava nessa resposta?
      </label>
      <div className="flex gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            onClick={() => onPick(level)}
            className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border bg-card py-2 sm:py-2.5 text-xs sm:text-sm text-muted-foreground transition-all hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <span className="text-sm sm:text-base font-semibold">{level}</span>
            <span className="mt-0.5 text-[0.6rem] sm:text-[0.65rem] leading-tight text-center hidden sm:inline">
              {CONFIDENCE_LABELS[level].split(" ")[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
