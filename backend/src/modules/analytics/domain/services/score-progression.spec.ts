import { describe, it, expect } from 'vitest';
import { scoreProgression } from './score-progression';
import type { AttemptRow } from '../ports/prova-analytics-source';

const attempt = (
  provaId: string,
  titulo: string,
  date: string,
  acertos: number,
  total: number,
): AttemptRow => ({
  provaId,
  titulo,
  dataFim: new Date(date),
  acertos,
  total,
});

describe('scoreProgression', () => {
  it('groups attempts per prova into chronological score points', () => {
    const out = scoreProgression([
      attempt('p1', 'Prova 1', '2026-07-21T10:00:00Z', 5, 10),
      attempt('p1', 'Prova 1', '2026-07-22T10:00:00Z', 8, 10),
    ]);
    expect(out).toEqual([
      {
        provaId: 'p1',
        titulo: 'Prova 1',
        points: [
          { date: '2026-07-21', scorePct: 50 },
          { date: '2026-07-22', scorePct: 80 },
        ],
      },
    ]);
  });

  it('orders provas by number of attempts (most retaken first)', () => {
    const out = scoreProgression([
      attempt('p1', 'P1', '2026-07-20T10:00:00Z', 1, 2),
      attempt('p2', 'P2', '2026-07-20T10:00:00Z', 1, 2),
      attempt('p2', 'P2', '2026-07-21T10:00:00Z', 2, 2),
    ]);
    expect(out.map((p) => p.provaId)).toEqual(['p2', 'p1']);
  });
});
