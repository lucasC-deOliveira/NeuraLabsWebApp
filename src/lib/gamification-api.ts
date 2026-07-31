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

// Lista por conceito (id, score, dominado) — o grafo pinta o território com isto.
export function getConquestConcepts(): Promise<ConquistaConceito[]> {
  return apiFetch<ConquistaConceito[]>("/analytics/conquest/concepts", { timeoutMs: 20_000 });
}

// Progresso: XP/nível (tempero) + conquistas de consistência e domínio.
export interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  current: number;
  target: number;
  progress: number;
}
export interface GamificationProgress {
  xp: number;
  level: number;
  xpInLevel: number;
  xpForNext: number;
  achievements: Achievement[];
}

export function getGamificationProgress(): Promise<GamificationProgress> {
  return apiFetch<GamificationProgress>("/analytics/progress", { timeoutMs: 20_000 });
}
