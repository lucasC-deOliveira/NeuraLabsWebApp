// Port do analytics. O adapter em infra/ implementa sobre @/lib/analytics-api.
import type { FlashcardAnalytics } from "../../domain/analytics.types";
import type { ProvaAnalytics } from "../../domain/prova-analytics.types";
import type { DeckAnalytics } from "../../domain/deck-analytics.types";

// `days` é a janela; baralhoId/assuntoId/provaId refinam por entidade.
export interface AnalyticsPort {
  getFlashcardAnalytics(
    days: number,
    baralhoId?: string,
    assuntoId?: string,
  ): Promise<FlashcardAnalytics>;
  getProvaAnalytics(days: number, provaId?: string): Promise<ProvaAnalytics>;
  getDeckAnalytics(days: number): Promise<DeckAnalytics>;
  // Opções de assunto para o filtro (reusa a hierarquia de conteúdo).
  getAssuntoOptions(): Promise<{ id: string; nome: string }[]>;
}
