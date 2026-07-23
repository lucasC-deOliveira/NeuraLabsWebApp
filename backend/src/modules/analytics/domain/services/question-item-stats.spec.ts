import { describe, it, expect } from 'vitest';
import { answerTotals, attemptHistory, alternativeShares } from './question-item-stats';
import type { QuestaoAnswerRow } from '../ports/questao-item-source';

function answer(day: string, acertou: boolean, escolhida: string): QuestaoAnswerRow {
  return { data: new Date(day), acertou, escolhida };
}

describe('answerTotals', () => {
  it('returns null accuracy without answers', () => {
    expect(answerTotals([])).toEqual({ respostas: 0, wrong: 0, accuracy: null });
  });

  it('counts answers, wrongs and accuracy', () => {
    const rows = [answer('2026-01-01', true, 'A'), answer('2026-01-02', false, 'B')];
    expect(answerTotals(rows)).toEqual({ respostas: 2, wrong: 1, accuracy: 50 });
  });
});

describe('attemptHistory', () => {
  it('orders the answers chronologically', () => {
    const rows = [answer('2026-01-03', true, 'A'), answer('2026-01-01', false, 'B')];
    expect(attemptHistory(rows)).toEqual([
      { date: '2026-01-01', acertou: false },
      { date: '2026-01-03', acertou: true },
    ]);
  });
});

describe('alternativeShares', () => {
  it('counts each chosen option, marks the gabarito and sorts by frequency', () => {
    const rows = [
      answer('2026-01-01', true, 'A'),
      answer('2026-01-02', false, 'B'),
      answer('2026-01-03', true, 'A'),
      answer('2026-01-04', false, 'C'),
    ];
    const shares = alternativeShares(rows, 'A');
    expect(shares[0]).toEqual({ opcao: 'A', count: 2, pct: 50, correta: true });
    expect(shares.map((s) => s.opcao)).toEqual(['A', 'B', 'C']);
    expect(shares.find((s) => s.opcao === 'B')?.correta).toBe(false);
  });

  it('is empty without answers', () => {
    expect(alternativeShares([], 'A')).toEqual([]);
  });
});
