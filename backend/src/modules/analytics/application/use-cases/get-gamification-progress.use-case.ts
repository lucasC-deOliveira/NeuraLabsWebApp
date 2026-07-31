import { addDays } from '../../domain/services/date-key';
import { studyStreak } from '../../domain/services/study-streak';
import {
  gamificationProgress,
  type GamificationProgress,
} from '../../domain/services/gamification-progress';
import type { FlashcardAnalyticsSource } from '../../domain/ports/flashcard-analytics-source';
import type { ContentCreationSource } from '../../domain/ports/content-creation-source';
import type { GetConquestSummaryUseCase } from './get-conquest-summary.use-case';

// Mesma janela do resumo de hábito: cobre a maior ofensiva plausível e serve de
// proxy honesto para o total de revisões (o mesmo dado que alimenta o streak).
const STREAK_WINDOW_DAYS = 400;

/**
 * XP/nível + conquistas (consistência e domínio). Compõe as revisões (streak +
 * contagem) com os conceitos dominados vindos da conquista do grafo.
 * @example useCase.execute('u1')
 */
export class GetGamificationProgressUseCase {
  constructor(
    private readonly source: FlashcardAnalyticsSource,
    private readonly conquest: GetConquestSummaryUseCase,
    private readonly creation: ContentCreationSource,
  ) {}

  async execute(userId: string): Promise<GamificationProgress> {
    const now = new Date();
    const since = addDays(now, -STREAK_WINDOW_DAYS);
    const reviews = await this.source.reviewsSince(userId, since);
    const [{ dominated }, creations] = await Promise.all([
      this.conquest.execute(userId),
      this.creation.creationEvents(userId, since),
    ]);
    const streak = studyStreak(reviews, now).current;
    return gamificationProgress({
      reviews: reviews.length,
      dominated,
      streak,
      created: creations.length,
    });
  }
}
