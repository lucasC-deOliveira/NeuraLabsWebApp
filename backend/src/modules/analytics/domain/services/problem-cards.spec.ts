import { describe, it, expect } from 'vitest';
import { rankProblemCards } from './problem-cards';
import type { ProblemCardRow } from '../ports/flashcard-analytics-source';

describe('rankProblemCards', () => {
  it('ranks by number of wrong answers and adds accuracy', () => {
    const out = rankProblemCards([
      { pergunta: 'A', total: 10, wrong: 2 },
      { pergunta: 'B', total: 10, wrong: 6 },
    ]);
    expect(out).toEqual([
      { pergunta: 'B', total: 10, wrong: 6, accuracy: 40 },
      { pergunta: 'A', total: 10, wrong: 2, accuracy: 80 },
    ]);
  });

  it('breaks ties by lower accuracy first', () => {
    const out = rankProblemCards([
      { pergunta: 'A', total: 10, wrong: 3 }, // 70%
      { pergunta: 'B', total: 5, wrong: 3 }, // 40%
    ]);
    expect(out.map((c) => c.pergunta)).toEqual(['B', 'A']);
  });

  it('keeps only the worst `limit`', () => {
    const rows: ProblemCardRow[] = Array.from({ length: 10 }, (_, i) => ({
      pergunta: `Q${i}`,
      total: 10,
      wrong: i + 1,
    }));
    expect(rankProblemCards(rows, 3)).toHaveLength(3);
    expect(rankProblemCards(rows, 3)[0].pergunta).toBe('Q9');
  });
});
