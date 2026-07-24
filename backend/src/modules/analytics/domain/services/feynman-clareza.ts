import { dateKey } from './date-key';
import type { FeynmanRow } from '../ports/feynman-analytics-source';
import type { FeynmanAnalytics, FeynmanClarezaDay } from '../feynman-analytics-views';

function computeTotals(rows: FeynmanRow[]): { explicacoes: number; alvos: number } {
  const alvos = new Set(rows.map((r) => `${r.alvoTipo}:${r.alvoId}`));
  return { explicacoes: rows.length, alvos: alvos.size };
}

function clarezaMedia(rows: FeynmanRow[]): number | null {
  if (rows.length === 0) return null;
  const soma = rows.reduce((acc, r) => acc + r.clareza, 0);
  return Math.round(soma / rows.length);
}

// Clareza média por dia (cronológica) + contagem de explicações.
function clarezaTrend(rows: FeynmanRow[]): FeynmanClarezaDay[] {
  const byDay = new Map<string, { soma: number; count: number }>();
  for (const row of rows) {
    const key = dateKey(row.data);
    const day = byDay.get(key) ?? { soma: 0, count: 0 };
    day.soma += row.clareza;
    day.count++;
    byDay.set(key, day);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, clareza: Math.round(d.soma / d.count), count: d.count }));
}

// Monta os analytics Feynman a partir das explicações do período.
export function feynmanAnalytics(rows: FeynmanRow[]): FeynmanAnalytics {
  return {
    totals: computeTotals(rows),
    clarezaMedia: clarezaMedia(rows),
    clarezaTrend: clarezaTrend(rows),
  };
}
