// ACL sobre @/lib/analytics-api. Só este adapter conhece a borda HTTP.
import { getFlashcardAnalytics, getProvaAnalytics, getDeckAnalytics } from "@/lib/analytics-api";
import { getSubjects } from "@/lib/content-api";
import type { AnalyticsPort } from "../../application/ports/analytics.port";
import type { FlashcardAnalytics } from "../../domain/analytics.types";
import type { ProvaAnalytics } from "../../domain/prova-analytics.types";
import type { DeckAnalytics } from "../../domain/deck-analytics.types";

export class HttpAnalyticsAdapter implements AnalyticsPort {
  getFlashcardAnalytics(days: number, baralhoId?: string, assuntoId?: string): Promise<FlashcardAnalytics> {
    return getFlashcardAnalytics(days, baralhoId, assuntoId);
  }

  async getAssuntoOptions(): Promise<{ id: string; nome: string }[]> {
    const subjects = await getSubjects();
    return subjects.map((s) => ({ id: s.id, nome: s.nome }));
  }

  getProvaAnalytics(days: number, provaId?: string): Promise<ProvaAnalytics> {
    return getProvaAnalytics(days, provaId);
  }

  getDeckAnalytics(days: number): Promise<DeckAnalytics> {
    return getDeckAnalytics(days);
  }
}
