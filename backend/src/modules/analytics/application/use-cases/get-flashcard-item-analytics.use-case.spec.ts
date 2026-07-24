import { describe, it, expect } from 'vitest';
import { GetFlashcardItemAnalyticsUseCase } from './get-flashcard-item-analytics.use-case';
import type {
  FlashcardItemMeta,
  FlashcardItemSource,
} from '../../domain/ports/flashcard-item-source';
import type { ReviewRow } from '../../domain/ports/flashcard-analytics-source';

function review(day: string, acertou: boolean, tipoErro: string | null = null): ReviewRow {
  return { data: new Date(day), acertou, nivelConfianca: 4, tempoResposta: null, tipoErro };
}

class FakeFlashcardItemSource implements FlashcardItemSource {
  constructor(
    private readonly meta: FlashcardItemMeta | null,
    private readonly reviews: ReviewRow[],
  ) {}
  cardReviews(): Promise<ReviewRow[]> {
    return Promise.resolve(this.reviews);
  }
  cardMeta(): Promise<FlashcardItemMeta | null> {
    return Promise.resolve(this.meta);
  }
}

describe('GetFlashcardItemAnalyticsUseCase', () => {
  it('returns null when the card is not found', async () => {
    const useCase = new GetFlashcardItemAnalyticsUseCase(new FakeFlashcardItemSource(null, []));
    expect(await useCase.execute('u1', 'missing')).toBeNull();
  });

  it('assembles totals, state and derived trends from the reviews', async () => {
    const meta: FlashcardItemMeta = {
      pergunta: 'O que é heap?',
      state: { fase: 'YOUNG', intervalo: 3, proximaRevisao: new Date('2026-02-01T00:00:00.000Z') },
    };
    const reviews = [review('2026-01-01', true), review('2026-01-02', false, 'CONCEITO')];
    const useCase = new GetFlashcardItemAnalyticsUseCase(
      new FakeFlashcardItemSource(meta, reviews),
    );

    const result = await useCase.execute('u1', 'c1');

    expect(result?.pergunta).toBe('O que é heap?');
    expect(result?.totals).toEqual({ reviews: 2, wrong: 1 });
    expect(result?.accuracy).toBe(50);
    expect(result?.state).toEqual({
      fase: 'YOUNG',
      intervalo: 3,
      proximaRevisao: '2026-02-01T00:00:00.000Z',
    });
    expect(result?.accuracyTrend).toHaveLength(2);
    expect(result?.errorTaxonomy).toEqual([{ tipo: 'CONCEITO', count: 1 }]);
  });
});
