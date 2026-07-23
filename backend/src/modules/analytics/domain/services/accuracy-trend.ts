import { dateKey } from './date-key';
import type { ReviewRow } from '../ports/flashcard-analytics-source';
import type { AccuracyDay } from '../analytics-views';

// Acurácia por dia (0-100) e nº de revisões, em ordem cronológica crescente.
export function accuracyTrend(reviews: ReviewRow[]): AccuracyDay[] {
  const byDay = new Map<string, { correct: number; total: number }>();
  for (const review of reviews) {
    const key = dateKey(review.data);
    const day = byDay.get(key) ?? { correct: 0, total: 0 };
    day.total++;
    if (review.acertou) day.correct++;
    byDay.set(key, day);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      accuracy: Math.round((d.correct / d.total) * 100),
      reviews: d.total,
    }));
}
