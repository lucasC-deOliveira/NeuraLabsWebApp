import { describe, it, expect } from 'vitest';
import { speedBuckets } from './speed-buckets';
import type { ReviewRow } from '../ports/flashcard-analytics-source';

const review = (tempoResposta: number | null, acertou: boolean): ReviewRow => ({
  data: new Date(),
  acertou,
  nivelConfianca: 3,
  tempoResposta,
  tipoErro: null,
});

describe('speedBuckets', () => {
  it('computes accuracy per speed bucket, in bucket order', () => {
    const out = speedBuckets([
      review(2000, true), // < 3s
      review(2500, false), // < 3s
      review(10_000, true), // 8-15s
    ]);
    expect(out).toEqual([
      { bucket: '< 3s', accuracy: 50, reviews: 2 },
      { bucket: '8–15s', accuracy: 100, reviews: 1 },
    ]);
  });

  it('ignores reviews without a response time', () => {
    expect(speedBuckets([review(null, true), review(0, false)])).toEqual([]);
  });
});
