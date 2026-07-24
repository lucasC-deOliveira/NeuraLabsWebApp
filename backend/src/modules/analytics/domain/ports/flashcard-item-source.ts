import type { ReviewRow } from './flashcard-analytics-source';

// Estado SM-2 cru de uma carta (datas ainda como Date, viram ISO na view).
export interface FlashcardItemStateRow {
  fase: string;
  intervalo: number;
  proximaRevisao: Date;
}

// Pergunta da carta + estado SM-2 do usuário (state null se nunca estudada).
export interface FlashcardItemMeta {
  pergunta: string;
  state: FlashcardItemStateRow | null;
}

// Read port para os analytics de UMA carta.
export interface FlashcardItemSource {
  // Revisões daquela carta feitas pelo usuário (vida toda), cronológicas.
  cardReviews(userId: string, cardId: string): Promise<ReviewRow[]>;
  // Pergunta + estado SM-2; null quando a carta não existe/não é do usuário.
  cardMeta(userId: string, cardId: string): Promise<FlashcardItemMeta | null>;
}

export const FLASHCARD_ITEM_SOURCE = Symbol('FLASHCARD_ITEM_SOURCE');
