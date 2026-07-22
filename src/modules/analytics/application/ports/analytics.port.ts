// Port do analytics. O adapter em infra/ implementa sobre @/lib/analytics-api.
import type { FlashcardAnalytics } from "../../domain/analytics.types";
import type { ProvaAnalytics } from "../../domain/prova-analytics.types";

export interface AnalyticsPort {
  getFlashcardAnalytics(): Promise<FlashcardAnalytics>;
  getProvaAnalytics(): Promise<ProvaAnalytics>;
}
