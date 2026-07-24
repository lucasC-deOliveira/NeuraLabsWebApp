// Borda HTTP do analytics (só a camada infra/ do módulo analytics importa isto).
import { apiFetch } from "./api";
import type { FlashcardAnalytics } from "@/modules/analytics/domain/analytics.types";
import type { ProvaAnalytics } from "@/modules/analytics/domain/prova-analytics.types";
import type { DeckAnalytics } from "@/modules/analytics/domain/deck-analytics.types";
import type { FlashcardItemAnalytics } from "@/modules/analytics/domain/flashcard-item.types";
import type { QuestaoItemAnalytics } from "@/modules/analytics/domain/questao-item.types";
import type { FeynmanAnalytics } from "@/modules/analytics/domain/feynman-analytics.types";

// `days` filtra a janela; `baralhoId`/`assuntoId` restringem as cartas (opcionais).
export function getFlashcardAnalytics(
  days: number,
  baralhoId?: string,
  assuntoId?: string,
): Promise<FlashcardAnalytics> {
  const deck = baralhoId ? `&baralhoId=${encodeURIComponent(baralhoId)}` : "";
  const subj = assuntoId ? `&assuntoId=${encodeURIComponent(assuntoId)}` : "";
  // Leitura rápida: 20s é folga de sobra e falha logo se algo estiver errado.
  return apiFetch<FlashcardAnalytics>(`/analytics/flashcards?days=${days}${deck}${subj}`, {
    timeoutMs: 20_000,
  });
}

export function getProvaAnalytics(days: number, provaId?: string): Promise<ProvaAnalytics> {
  const prova = provaId ? `&provaId=${encodeURIComponent(provaId)}` : "";
  return apiFetch<ProvaAnalytics>(`/analytics/provas?days=${days}${prova}`, { timeoutMs: 20_000 });
}

export function getDeckAnalytics(days: number): Promise<DeckAnalytics> {
  return apiFetch<DeckAnalytics>(`/analytics/decks?days=${days}`, { timeoutMs: 20_000 });
}

export function getFeynmanAnalytics(days: number): Promise<FeynmanAnalytics> {
  return apiFetch<FeynmanAnalytics>(`/analytics/feynman?days=${days}`, { timeoutMs: 20_000 });
}

// Analytics de UMA carta (histórico daquele flashcard).
export function getFlashcardItemAnalytics(id: string): Promise<FlashcardItemAnalytics> {
  return apiFetch<FlashcardItemAnalytics>(`/analytics/flashcards/${encodeURIComponent(id)}`, {
    timeoutMs: 20_000,
  });
}

// Analytics de UMA questão (respostas daquele item nas tentativas).
export function getQuestaoItemAnalytics(id: string): Promise<QuestaoItemAnalytics> {
  return apiFetch<QuestaoItemAnalytics>(`/analytics/questoes/${encodeURIComponent(id)}`, {
    timeoutMs: 20_000,
  });
}
