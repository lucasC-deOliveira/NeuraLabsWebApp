import type { StudySessionSummary } from './study-views';

export interface SessionReview {
  acertou: boolean;
  nivelConfianca: number;
}

export interface RawSession {
  id: string;
  dataInicio: Date;
  dataFim: Date | null;
  totalReviews: number;
  reviews: SessionReview[];
}

// Summarizes a study session: correct/incorrect counts and average confidence.
// Pure logic.
export function summarizeSession(s: RawSession): StudySessionSummary {
  const correctCount = s.reviews.filter((r) => r.acertou).length;
  const avgConfidence = s.reviews.length
    ? s.reviews.reduce((sum, r) => sum + r.nivelConfianca, 0) / s.reviews.length
    : 0;
  return {
    id: s.id,
    dataInicio: s.dataInicio,
    dataFim: s.dataFim,
    totalReviews: s.totalReviews,
    correctCount,
    incorrectCount: s.reviews.length - correctCount,
    avgConfidence,
  };
}
