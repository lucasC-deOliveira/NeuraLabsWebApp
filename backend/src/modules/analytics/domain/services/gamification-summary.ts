import { dateKey } from './date-key';
import { studyStreak } from './study-streak';
import type { ReviewRow } from '../ports/flashcard-analytics-source';

// Resumo do laço de hábito da gamificação: quantas revisões saíram HOJE (para o
// anel de meta diária, cujo alvo é preferência do cliente) e a ofensiva atual.
// Reusa o streak que já existe — a gamificação mede, não redefine, a consistência.
export interface GamificationSummary {
  reviewsToday: number;
  streak: number;
}

/**
 * Monta o resumo a partir do histórico de revisões.
 * @example gamificationSummary(reviews, new Date())
 */
export function gamificationSummary(reviews: ReviewRow[], now: Date): GamificationSummary {
  const today = dateKey(now);
  const reviewsToday = reviews.reduce((n, r) => n + (dateKey(r.data) === today ? 1 : 0), 0);
  return { reviewsToday, streak: studyStreak(reviews, now).current };
}
