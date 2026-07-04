// Pure dashboard derivations (accuracy, due count, subject mapping, dates).
import type { SubjectWithTopics, SubjectSummary, StudySessionEntry, DueCandidate } from "../dashboard.types";

/** Overall accuracy across sessions as a rounded %, or null when no reviews. */
export function computeAccuracy(sessions: StudySessionEntry[]): number | null {
  const totalCorrect = sessions.reduce((sum, s) => sum + s.correctCount, 0);
  const totalReviews = sessions.reduce((sum, s) => sum + s.totalReviews, 0);
  if (totalReviews === 0) return null;
  return Math.round((totalCorrect / totalReviews) * 100);
}

/** Cards that are due: never scheduled (new) or whose next review is due by now. */
export function countDueCards(cards: DueCandidate[], now: Date = new Date()): number {
  return cards.filter((fc) => !fc.spacedRepetition || new Date(fc.spacedRepetition.proximaRevisao) <= now).length;
}

/** Maps subjects to the summary shape shown in the grid. */
export function toSubjectSummaries(subjects: SubjectWithTopics[]): SubjectSummary[] {
  return subjects.map((s) => ({ id: s.id, nome: s.nome, descricao: s.descricao, topicoCount: s.topicos.length }));
}

/** Per-session accuracy % (0 when no reviews). */
export function sessionAccuracy(session: StudySessionEntry): number {
  return session.totalReviews > 0 ? Math.round((session.correctCount / session.totalReviews) * 100) : 0;
}

/** Humanizes a date relative to `now` (pt-BR). */
export function formatRelativeDate(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "agora mesmo";
  if (diffMins < 60) return `${diffMins} min atrás`;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h atrás`;
  return `${Math.floor(diffMs / 86400000)} dia(s) atrás`;
}
