import type { DeckAnalyticsSource } from '../../domain/ports/deck-analytics-source';
import { deckStats } from '../../domain/services/deck-stats';
import type { DeckAnalytics } from '../../domain/deck-analytics-views';

/**
 * Reúne o analytics por baralho: acurácia, maturidade e cartas devidas de cada um.
 * @example useCase.execute(userId)
 */
export class GetDeckAnalyticsUseCase {
  constructor(private readonly source: DeckAnalyticsSource) {}

  async execute(userId: string): Promise<DeckAnalytics> {
    const now = new Date();
    const [cards, reviews] = await Promise.all([
      this.source.deckCards(userId),
      this.source.cardReviewStats(userId),
    ]);
    const decks = deckStats(cards, reviews, now);
    return { totals: { decks: decks.length, cards: cards.length }, decks };
  }
}
