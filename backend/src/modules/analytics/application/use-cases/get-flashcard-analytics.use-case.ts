import type {
  FlashcardAnalyticsSource,
  LearningStateRow,
  ProblemCardRow,
  ReviewRow,
} from '../../domain/ports/flashcard-analytics-source';
import { retentionForecast } from '../../domain/services/retention-forecast';
import { maturityMix } from '../../domain/services/maturity-mix';
import { accuracyTrend } from '../../domain/services/accuracy-trend';
import { performanceProfile } from '../../domain/services/performance-profile';
import { errorTaxonomy } from '../../domain/services/error-taxonomy';
import { speedBuckets } from '../../domain/services/speed-buckets';
import { studyStreak } from '../../domain/services/study-streak';
import { rankProblemCards } from '../../domain/services/problem-cards';
import { addDays } from '../../domain/services/date-key';
import type { FlashcardAnalytics } from '../../domain/analytics-views';

// Janela das métricas temporais (tendência, velocidade, perfil).
const WINDOW_DAYS = 90;

/**
 * Reúne os analytics de flashcards do usuário: forecast de revisões, mix de
 * maturidade, tendência de acurácia e o radar de perfil.
 * @example useCase.execute(userId)
 */
export class GetFlashcardAnalyticsUseCase {
  constructor(private readonly source: FlashcardAnalyticsSource) {}

  async execute(userId: string): Promise<FlashcardAnalytics> {
    const now = new Date();
    const [states, reviews, problems] = await Promise.all([
      this.source.learningStates(userId),
      this.source.reviewsSince(userId, addDays(now, -WINDOW_DAYS)),
      this.source.problemCardStats(userId),
    ]);
    return assemble(states, reviews, problems, now);
  }
}

function assemble(
  states: LearningStateRow[],
  reviews: ReviewRow[],
  problems: ProblemCardRow[],
  now: Date,
): FlashcardAnalytics {
  return {
    totals: { cards: states.length, reviews: reviews.length },
    retentionForecast: retentionForecast(states, now),
    maturity: maturityMix(states),
    accuracyTrend: accuracyTrend(reviews),
    profile: performanceProfile(reviews, states, now),
    errorTaxonomy: errorTaxonomy(reviews),
    speedBuckets: speedBuckets(reviews),
    streak: studyStreak(reviews, now),
    problemCards: rankProblemCards(problems),
  };
}
