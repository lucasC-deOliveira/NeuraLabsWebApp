"use client";

import type { ReactNode } from "react";

// Cartão que envolve cada gráfico — título + dica curta + a área do gráfico.
export function ChartCard({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

interface TipEntry {
  name?: string;
  value?: number | string;
  color?: string;
}

// Tooltip temático (claro/escuro via tokens). Recharts passa `payload` no hover.
export function ChartTip({
  active,
  payload,
  label,
  unit = "",
}: {
  active?: boolean;
  payload?: TipEntry[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      {label !== undefined && label !== "" && <p className="mb-0.5 font-medium">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-1.5">
          {entry.color && <span className="size-2 rounded-full" style={{ background: entry.color }} />}
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium tabular-nums">
            {entry.value}
            {unit}
          </span>
        </p>
      ))}
    </div>
  );
}
