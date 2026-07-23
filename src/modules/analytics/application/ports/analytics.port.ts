// Port do analytics. O adapter em infra/ implementa sobre @/lib/analytics-api.
import type { FlashcardAnalytics } from "../../domain/analytics.types";
import type { ProvaAnalytics } from "../../domain/prova-analytics.types";
import type { DeckAnalytics } from "../../domain/deck-analytics.types";

// `days` é a janela de tempo do filtro de período.
export interface AnalyticsPort {
  getFlashcardAnalytics(days: number): Promise<FlashcardAnalytics>;
  getProvaAnalytics(days: number): Promise<ProvaAnalytics>;
  getDeckAnalytics(days: number): Promise<DeckAnalytics>;
}
