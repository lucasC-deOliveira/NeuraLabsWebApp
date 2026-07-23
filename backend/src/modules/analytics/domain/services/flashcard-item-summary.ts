import type { ReviewRow } from '../ports/flashcard-analytics-source';

export interface ReviewSummary {
  reviews: number;
  wrong: number;
  accuracy: number | null; // 0-100; null sem revisões
  avgConfidence: number | null; // 1 casa decimal; null sem revisões
}

// Agrega as revisões de uma carta: total, erros, acurácia e confiança média.
export function summarizeReviews(reviews: ReviewRow[]): ReviewSummary {
  const total = reviews.length;
  if (total === 0) return { reviews: 0, wrong: 0, accuracy: null, avgConfidence: null };
  const correct = reviews.filter((r) => r.acertou).length;
  const confidence = reviews.reduce((sum, r) => sum + r.nivelConfianca, 0);
  return {
    reviews: total,
    wrong: total - correct,
    accuracy: Math.round((correct / total) * 100),
    avgConfidence: Math.round((confidence / total) * 10) / 10,
  };
}
