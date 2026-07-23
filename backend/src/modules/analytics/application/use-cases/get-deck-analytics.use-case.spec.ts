import { describe, it, expect } from 'vitest';
import { GetDeckAnalyticsUseCase } from './get-deck-analytics.use-case';
import type {
  CardReviewStat,
  DeckAnalyticsSource,
  DeckCardRow,
} from '../../domain/ports/deck-analytics-source';

class FakeDeckAnalyticsSource implements DeckAnalyticsSource {
  constructor(
    private readonly cards: DeckCardRow[],
    private readonly reviews: CardReviewStat[] = [],
  ) {}
  async deckCards(): Promise<DeckCardRow[]> {
    return this.cards;
  }
  async cardReviewStats(): Promise<CardReviewStat[]> {
    return this.reviews;
  }
}

describe('GetDeckAnalyticsUseCase', () => {
  it('assembles per-deck stats and totals', async () => {
    const source = new FakeDeckAnalyticsSource(
      [
        {
          baralhoId: 'b1',
          titulo: 'B1',
          flashcardId: 'f1',
          fase: 'REVIEW',
          intervalo: 30,
          proximaRevisao: new Date('2026-08-01'),
        },
      ],
      [{ flashcardId: 'f1', total: 2, correct: 2 }],
    );
    const result = await new GetDeckAnalyticsUseCase(source).execute('u1');
    expect(result.totals).toEqual({ decks: 1, cards: 1 });
    expect(result.decks[0]).toMatchObject({ titulo: 'B1', cards: 1, mature: 1, accuracy: 100 });
  });
});
