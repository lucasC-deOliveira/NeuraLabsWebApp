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

// Conquista do grafo: conceitos dominados (SRS + questões + Feynman) vs em progresso.
export interface ConquistaConceito {
  conceitoId: string;
  nome: string;
  score: number;
  dominated: boolean;
}
export interface ConquestSummary {
  dominated: number;
  inProgress: number;
  studied: number;
  quaseLa: ConquistaConceito[];
}

export function getConquestSummary(): Promise<ConquestSummary> {
  return apiFetch<ConquestSummary>("/analytics/conquest", { timeoutMs: 20_000 });
}
