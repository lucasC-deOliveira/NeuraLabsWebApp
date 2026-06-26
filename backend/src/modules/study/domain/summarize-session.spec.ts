import { describe, it, expect } from 'vitest';
import { summarizeSession } from './summarize-session';

describe('summarizeSession', () => {
  it('counts correct/incorrect and averages confidence', () => {
    const s = summarizeSession({
      id: 's1',
      dataInicio: new Date(0),
      dataFim: null,
      totalReviews: 3,
      reviews: [
        { acertou: true, nivelConfianca: 4 },
        { acertou: false, nivelConfianca: 2 },
        { acertou: true, nivelConfianca: 3 },
      ],
    });
    expect(s).toMatchObject({
      correctCount: 2,
      incorrectCount: 1,
      avgConfidence: 3,
      totalReviews: 3,
    });
  });

  it('uses zero average confidence with no reviews', () => {
    const s = summarizeSession({
      id: 's1',
      dataInicio: new Date(0),
      dataFim: new Date(0),
      totalReviews: 0,
      reviews: [],
    });
    expect(s.avgConfidence).toBe(0);
    expect(s.correctCount).toBe(0);
  });
});
