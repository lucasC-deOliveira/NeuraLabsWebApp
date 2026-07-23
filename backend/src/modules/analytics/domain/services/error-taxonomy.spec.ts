import { describe, it, expect } from 'vitest';
import { errorTaxonomy } from './error-taxonomy';
import type { ReviewRow } from '../ports/flashcard-analytics-source';

const review = (acertou: boolean, tipoErro: string | null): ReviewRow => ({
  data: new Date(),
  acertou,
  nivelConfianca: 3,
  tempoResposta: 5000,
  tipoErro,
});

describe('errorTaxonomy', () => {
  it('counts wrong reviews by error type, most frequent first', () => {
    expect(
      errorTaxonomy([
        review(false, 'conceito'),
        review(false, 'distração'),
        review(false, 'conceito'),
        review(true, null),
      ]),
    ).toEqual([
      { tipo: 'conceito', count: 2 },
      { tipo: 'distração', count: 1 },
    ]);
  });

  it('ignores correct reviews and wrong ones without a type', () => {
    expect(errorTaxonomy([review(true, 'conceito'), review(false, null)])).toEqual([]);
  });
});
