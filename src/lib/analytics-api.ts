// Borda HTTP do analytics (só a camada infra/ do módulo analytics importa isto).
import { apiFetch } from "./api";
import type { FlashcardAnalytics } from "@/modules/analytics/domain/analytics.types";
import type { ProvaAnalytics } from "@/modules/analytics/domain/prova-analytics.types";

export function getFlashcardAnalytics(): Promise<FlashcardAnalytics> {
  // Leitura rápida: 20s é folga de sobra e falha logo se algo estiver errado.
  return apiFetch<FlashcardAnalytics>("/analytics/flashcards", { timeoutMs: 20_000 });
}

export function getProvaAnalytics(): Promise<ProvaAnalytics> {
  return apiFetch<ProvaAnalytics>("/analytics/provas", { timeoutMs: 20_000 });
}
