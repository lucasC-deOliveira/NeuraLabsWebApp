import type { AccuracyDay, ErrorTypeCount } from "./analytics.types";

// Estado SM-2 atual de uma carta para o usuário (null se nunca estudada).
export interface FlashcardItemState {
  fase: string;
  intervalo: number; // dias até a próxima revisão
  proximaRevisao: string; // ISO date
}

// Analytics de UMA carta: histórico de revisões daquele flashcard.
export interface FlashcardItemAnalytics {
  pergunta: string;
  totals: { reviews: number; wrong: number };
  accuracy: number | null; // 0-100; null sem revisões
  avgConfidence: number | null; // 1-5; null sem revisões
  state: FlashcardItemState | null;
  accuracyTrend: AccuracyDay[];
  errorTaxonomy: ErrorTypeCount[];
}
