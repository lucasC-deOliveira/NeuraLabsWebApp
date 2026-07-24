// Port do analytics. O adapter em infra/ implementa sobre @/lib/analytics-api.
import type { FlashcardAnalytics } from "../../domain/analytics.types";
import type { ProvaAnalytics } from "../../domain/prova-analytics.types";
import type { DeckAnalytics } from "../../domain/deck-analytics.types";
import type { FlashcardItemAnalytics } from "../../domain/flashcard-item.types";
import type { QuestaoItemAnalytics } from "../../domain/questao-item.types";

// `days` é a janela; baralhoId/assuntoId/provaId refinam por entidade.
export interface AnalyticsPort {
  getFlashcardAnalytics(
    days: number,
    baralhoId?: string,
    assuntoId?: string,
  ): Promise<FlashcardAnalytics>;
  getProvaAnalytics(days: number, provaId?: string): Promise<ProvaAnalytics>;
  getDeckAnalytics(days: number): Promise<DeckAnalytics>;
  // Analytics de um item específico (nó do grafo).
  getFlashcardItemAnalytics(id: string): Promise<FlashcardItemAnalytics>;
  getQuestaoItemAnalytics(id: string): Promise<QuestaoItemAnalytics>;
  // Opções de assunto para o filtro (reusa a hierarquia de conteúdo).
  getAssuntoOptions(): Promise<{ id: string; nome: string }[]>;
}
