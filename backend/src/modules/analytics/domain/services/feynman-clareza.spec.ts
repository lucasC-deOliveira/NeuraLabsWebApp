import { describe, it, expect } from 'vitest';
import { feynmanAnalytics } from './feynman-clareza';
import type { FeynmanRow } from '../ports/feynman-analytics-source';

const row = (day: string, clareza: number, alvoId: string): FeynmanRow => ({
  data: new Date(day),
  clareza,
  alvoTipo: 'CONCEITO',
  alvoId,
});

describe('feynmanAnalytics', () => {
  it('is empty-safe', () => {
    expect(feynmanAnalytics([])).toEqual({
      totals: { explicacoes: 0, alvos: 0 },
      clarezaMedia: null,
      clarezaTrend: [],
    });
  });

  it('counts distinct targets, averages clarity and trends by day', () => {
    const rows = [
      row('2026-01-01', 60, 'c1'),
      row('2026-01-01', 80, 'c1'), // mesmo alvo, mesmo dia
      row('2026-01-02', 40, 'c2'),
    ];
    const a = feynmanAnalytics(rows);
    expect(a.totals).toEqual({ explicacoes: 3, alvos: 2 });
    expect(a.clarezaMedia).toBe(60); // (60+80+40)/3 = 60
    expect(a.clarezaTrend).toEqual([
      { date: '2026-01-01', clareza: 70, count: 2 },
      { date: '2026-01-02', clareza: 40, count: 1 },
    ]);
  });
});
