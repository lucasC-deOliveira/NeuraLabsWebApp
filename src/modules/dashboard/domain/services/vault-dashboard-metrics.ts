import type { DueCandidate, StudySessionEntry, VaultDashboardMetrics } from "../dashboard.types";
import { computeAccuracy, countDueCards } from "./dashboard-metrics";

function localDay(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function studyStreak(activity: StudySessionEntry[], now: Date): number {
  const days = new Set(activity.map((entry) => localDay(entry.dataFim ?? entry.dataInicio)));
  const cursor = new Date(now);
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDay(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Calculates local metrics without counting the same saved attempt twice.
 * @example const metrics = vaultDashboardMetrics(cards, reviews, attempts, new Date())
 */
export function vaultDashboardMetrics(
  cards: DueCandidate[], reviews: StudySessionEntry[], attempts: StudySessionEntry[], now: Date,
): VaultDashboardMetrics {
  const exams = [...new Map(attempts.map((attempt) => [attempt.id, attempt])).values()];
  const activity = [...reviews, ...exams].sort((a, b) =>
    (b.dataFim ?? b.dataInicio).getTime() - (a.dataFim ?? a.dataInicio).getTime());
  return {
    sessions: activity.slice(0, 5),
    dueCardCount: countDueCards(cards, now),
    accuracy: computeAccuracy(reviews),
    streak: studyStreak(activity, now),
    examAttempts: exams.length,
  };
}
