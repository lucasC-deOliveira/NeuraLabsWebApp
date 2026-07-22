// Borda HTTP do analytics (só a camada infra/ do módulo analytics importa isto).
import { apiFetch } from "./api";
import type { FlashcardAnalytics } from "@/modules/analytics/domain/analytics.types";

export function getFlashcardAnalytics(): Promise<FlashcardAnalytics> {
  return apiFetch<FlashcardAnalytics>("/analytics/flashcards");
}
