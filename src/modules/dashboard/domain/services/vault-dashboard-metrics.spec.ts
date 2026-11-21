import { expect, it } from "vitest";
import type { StudySessionEntry } from "../dashboard.types";
import { vaultDashboardMetrics } from "./vault-dashboard-metrics";

function activity(id: string, date: Date, total: number, correctCount: number): StudySessionEntry {
  return {
    id, dataInicio: date, dataFim: date, totalReviews: total, correctCount,
    incorrectCount: total - correctCount, avgConfidence: 0,
  };
}

it("uses local schedules and reviews while including completed exams in activity and the streak", () => {
  const now = new Date(2026, 10, 21, 9);
  const previous = new Date(2026, 10, 20, 12);
  const future = new Date(2026, 10, 22, 12);
  const recent = activity("review-1", previous, 2, 1);
  const exam = { ...activity("exam-1", now, 20, 20), examTitle: "SERPRO" };
  const metrics = vaultDashboardMetrics([
    { spacedRepetition: null },
    { spacedRepetition: { proximaRevisao: previous } },
    { spacedRepetition: { proximaRevisao: future } },
  ], [recent], [exam, { ...exam }], now);
  expect(metrics).toEqual({ sessions: [exam, recent], dueCardCount: 2, accuracy: 50, streak: 2, examAttempts: 1 });
});

it("keeps yesterday's streak open and shows no review accuracy for an exams-only history", () => {
  const now = new Date(2026, 10, 21, 9);
  const exam = activity("exam-1", new Date(2026, 10, 20, 12), 1, 1);
  expect(vaultDashboardMetrics([], [], [exam], now)).toMatchObject({ accuracy: null, streak: 1 });
});
