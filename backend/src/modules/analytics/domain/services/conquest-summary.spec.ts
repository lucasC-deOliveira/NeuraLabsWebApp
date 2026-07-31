import { describe, it, expect } from 'vitest';
import { conquestSummary, type ConceptSignalRow } from './conquest-summary';

const row = (id: string, s: Partial<ConceptSignalRow>): ConceptSignalRow => ({
  conceitoId: id,
  nome: `Conceito ${id}`,
  flashcardMastery: null,
  questionAccuracy: null,
  feynmanClarity: null,
  ...s,
});

describe('conquestSummary', () => {
  it('counts dominated vs in-progress among studied concepts', () => {
    const summary = conquestSummary([
      row('dom', { flashcardMastery: 0.8 }),
      row('prog', { flashcardMastery: 0.3 }),
    ]);

    expect(summary).toMatchObject({ dominated: 1, inProgress: 1, studied: 2 });
  });

  // O número é sobre o que foi ESTUDADO — conceitos sem evidência não entram, senão
  // milhares de conceitos nunca vistos afogariam o progresso.
  it('ignores concepts with no evidence at all', () => {
    const summary = conquestSummary([row('vazio', {}), row('dom', { questionAccuracy: 0.9 })]);

    expect(summary.studied).toBe(1);
    expect(summary.dominated).toBe(1);
  });

  it('surfaces the in-progress concepts closest to mastery first', () => {
    const summary = conquestSummary([
      row('quase', { flashcardMastery: 0.55 }),
      row('longe', { flashcardMastery: 0.1 }),
    ]);

    expect(summary.quaseLa.map((c) => c.conceitoId)).toEqual(['quase', 'longe']);
  });

  it('is all zeros for an empty history', () => {
    expect(conquestSummary([])).toEqual({ dominated: 0, inProgress: 0, studied: 0, quaseLa: [] });
  });
});
