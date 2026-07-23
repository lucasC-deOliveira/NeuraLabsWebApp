import { addDays } from '../../domain/services/date-key';
import type { DeckAnalyticsSource } from '../../domain/ports/deck-analytics-source';
import { deckStats } from '../../domain/services/deck-stats';
import type { DeckAnalytics } from '../../domain/deck-analytics-views';

const DEFAULT_WINDOW_DAYS = 90;

/**
 * Reúne o analytics por baralho: acurácia, maturidade e cartas devidas de cada um.
 * `days` filtra a acurácia (o estado atual — maduras/devidas — não muda). Padrão 90.
 * @example useCase.execute(userId, 30)
 */
export class GetDeckAnalyticsUseCase {
  constructor(private readonly source: DeckAnalyticsSource) {}

  async execute(userId: string, days = DEFAULT_WINDOW_DAYS): Promise<DeckAnalytics> {
    const now = new Date();
    const [cards, reviews] = await Promise.all([
      this.source.deckCards(userId),
      this.source.cardReviewStats(userId, addDays(now, -days)),
    ]);
    const decks = deckStats(cards, reviews, now);
    return { totals: { decks: decks.length, cards: cards.length }, decks };
  }
}
