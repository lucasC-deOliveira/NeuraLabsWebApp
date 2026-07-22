// ACL sobre @/lib/analytics-api. Só este adapter conhece a borda HTTP.
import { getFlashcardAnalytics } from "@/lib/analytics-api";
import type { AnalyticsPort } from "../../application/ports/analytics.port";
import type { FlashcardAnalytics } from "../../domain/analytics.types";

export class HttpAnalyticsAdapter implements AnalyticsPort {
  getFlashcardAnalytics(): Promise<FlashcardAnalytics> {
    return getFlashcardAnalytics();
  }
}
