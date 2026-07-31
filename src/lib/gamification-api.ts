// Borda HTTP da gamificação. O resumo do laço de hábito (revisões de hoje +
// ofensiva) vem do módulo analytics no backend, calculado do histórico.
import { apiFetch } from "./api";

export interface GamificationSummary {
  reviewsToday: number;
  streak: number;
}

export function getGamificationSummary(): Promise<GamificationSummary> {
  return apiFetch<GamificationSummary>("/analytics/gamification", { timeoutMs: 15_000 });
}
