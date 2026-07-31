import { describe, it, expect } from 'vitest';
import { builderSummary } from './builder-summary';
import type { CreatedTotals } from '../ports/content-creation-source';

const totals: CreatedTotals = {
  flashcard: 120,
  questao: 5,
  baralho: 3,
  prova: 1,
  edital: 0,
  feynman: 2,
  nota: 4,
  node: 15,
};

describe('builderSummary', () => {
  it('sums the per-kind totals into a single created count', () => {
    const s = builderSummary({
      creationStreak: 4,
      createdTotals: totals,
      breadth: { concepts: 300, topics: 40, subjects: 6 },
      recentTerritory: [],
    });
    expect(s.created).toBe(120 + 5 + 3 + 1 + 0 + 2 + 4 + 15);
    expect(s.creationStreak).toBe(4);
  });

  it('derives builder badges from totals and breadth', () => {
    const s = builderSummary({
      creationStreak: 0,
      createdTotals: totals,
      breadth: { concepts: 300, topics: 40, subjects: 6 },
      recentTerritory: [],
    });
    expect(s.achievements.find((a) => a.id === 'flashcards-100')?.earned).toBe(true);
    expect(s.achievements.find((a) => a.id === 'concepts-500')?.earned).toBe(false);
    expect(s.achievements.find((a) => a.id === 'subjects-5')?.earned).toBe(true);
  });

  it('passes recent territory through untouched', () => {
    const territory = [{ referenciaId: 'a1', nome: 'Redes', tipo: 'ASSUNTO' as const }];
    const s = builderSummary({
      creationStreak: 0,
      createdTotals: totals,
      breadth: { concepts: 0, topics: 0, subjects: 0 },
      recentTerritory: territory,
    });
    expect(s.recentTerritory).toEqual(territory);
  });
});
