// ACL sobre @/lib/analytics-api. Só este adapter conhece a borda HTTP.
import { getFlashcardAnalytics, getProvaAnalytics, getDeckAnalytics } from "@/lib/analytics-api";
import type { AnalyticsPort } from "../../application/ports/analytics.port";
import type { FlashcardAnalytics } from "../../domain/analytics.types";
import type { ProvaAnalytics } from "../../domain/prova-analytics.types";
import type { DeckAnalytics } from "../../domain/deck-analytics.types";

export class HttpAnalyticsAdapter implements AnalyticsPort {
  getFlashcardAnalytics(): Promise<FlashcardAnalytics> {
    return getFlashcardAnalytics();
  }

  getProvaAnalytics(): Promise<ProvaAnalytics> {
    return getProvaAnalytics();
  }

  getDeckAnalytics(): Promise<DeckAnalytics> {
    return getDeckAnalytics();
  }
}
