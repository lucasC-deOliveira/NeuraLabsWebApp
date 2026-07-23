import { addDays, dateKey } from './date-key';
import type { ReviewRow } from '../ports/flashcard-analytics-source';
import type { StudyStreak } from '../analytics-views';

// Streak + revisões por dia. O streak conta dias consecutivos com revisão terminando
// hoje; com carência de um dia (se hoje ainda não estudou mas ontem sim, conta a
// partir de ontem — você ainda tem o dia de hoje para manter).
export function studyStreak(reviews: ReviewRow[], now: Date): StudyStreak {
  const counts = new Map<string, number>();
  for (const review of reviews) {
    const key = dateKey(review.data);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const calendar = [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { current: countStreak(counts, now), calendar };
}

function countStreak(counts: Map<string, number>, now: Date): number {
  let cursor = counts.has(dateKey(now)) ? now : addDays(now, -1);
  let streak = 0;
  while (counts.has(dateKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
