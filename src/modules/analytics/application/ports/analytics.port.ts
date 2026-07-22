// Port do analytics. O adapter em infra/ implementa sobre @/lib/analytics-api.
import type { FlashcardAnalytics } from "../../domain/analytics.types";

export interface AnalyticsPort {
  getFlashcardAnalytics(): Promise<FlashcardAnalytics>;
}
