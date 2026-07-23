// Borda HTTP do analytics (só a camada infra/ do módulo analytics importa isto).
import { apiFetch } from "./api";
import type { FlashcardAnalytics } from "@/modules/analytics/domain/analytics.types";
import type { ProvaAnalytics } from "@/modules/analytics/domain/prova-analytics.types";
import type { DeckAnalytics } from "@/modules/analytics/domain/deck-analytics.types";

// `days` filtra a janela das métricas temporais (padrão 90 no backend).
export function getFlashcardAnalytics(days: number): Promise<FlashcardAnalytics> {
  // Leitura rápida: 20s é folga de sobra e falha logo se algo estiver errado.
  return apiFetch<FlashcardAnalytics>(`/analytics/flashcards?days=${days}`, { timeoutMs: 20_000 });
}

export function getProvaAnalytics(days: number): Promise<ProvaAnalytics> {
  return apiFetch<ProvaAnalytics>(`/analytics/provas?days=${days}`, { timeoutMs: 20_000 });
}

export function getDeckAnalytics(days: number): Promise<DeckAnalytics> {
  return apiFetch<DeckAnalytics>(`/analytics/decks?days=${days}`, { timeoutMs: 20_000 });
}
