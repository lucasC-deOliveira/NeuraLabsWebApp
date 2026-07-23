"use client";

import type { ReactNode } from "react";
import { PERIOD_OPTIONS, type PeriodValue } from "./period";

// Barra de filtros no topo de uma aba: seletor de período + filtros específicos
// da aba (children, ex.: baralho/prova).
export function FilterBar({
  period,
  onPeriod,
  children,
}: {
  period: PeriodValue;
  onPeriod: (p: PeriodValue) => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="Período">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={period === opt.value}
            onClick={() => onPeriod(opt.value)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              period === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
