import type { AccuracyDay, ErrorTypeCount } from './analytics-views';

// Estado SM-2 atual de uma carta para o usuário (null quando nunca estudada).
export interface FlashcardItemState {
  fase: string; // LEARN | YOUNG | MATURE... (linguagem do agendador)
  intervalo: number; // dias até a próxima revisão
  proximaRevisao: string; // ISO date
}

// Analytics de UMA carta: histórico de revisões daquele card para o usuário.
export interface FlashcardItemAnalytics {
  pergunta: string;
  totals: { reviews: number; wrong: number };
  accuracy: number | null; // 0-100; null sem revisões
  avgConfidence: number | null; // média do nível de confiança (1-5); null sem revisões
  state: FlashcardItemState | null;
  accuracyTrend: AccuracyDay[];
  errorTaxonomy: ErrorTypeCount[];
}
