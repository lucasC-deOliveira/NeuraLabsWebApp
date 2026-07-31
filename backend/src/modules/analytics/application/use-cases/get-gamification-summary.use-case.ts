import { addDays } from '../../domain/services/date-key';
import {
  gamificationSummary,
  type GamificationSummary,
} from '../../domain/services/gamification-summary';
import type { FlashcardAnalyticsSource } from '../../domain/ports/flashcard-analytics-source';

// Janela larga o bastante para a maior ofensiva plausível — o streak precisa dos
// dias consecutivos, não só de hoje.
const STREAK_WINDOW_DAYS = 400;

/**
 * Resumo do laço de hábito (revisões de hoje + ofensiva). Reusa a mesma fonte de
 * revisões do analytics; a meta diária é do cliente, então não entra aqui.
 * @example useCase.execute('u1')
 */
export class GetGamificationSummaryUseCase {
  constructor(private readonly source: FlashcardAnalyticsSource) {}

  async execute(userId: string): Promise<GamificationSummary> {
    const now = new Date();
    const reviews = await this.source.reviewsSince(userId, addDays(now, -STREAK_WINDOW_DAYS));
    return gamificationSummary(reviews, now);
  }
}
