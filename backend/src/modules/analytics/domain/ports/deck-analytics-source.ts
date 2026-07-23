// Read port do analytics por baralho. Linhas cruas que o serviço de domínio agrega.

export interface DeckCardRow {
  baralhoId: string;
  titulo: string;
  flashcardId: string;
  fase: string | null; // null = carta nunca estudada
  intervalo: number | null;
  proximaRevisao: Date | null;
}

export interface CardReviewStat {
  flashcardId: string;
  total: number;
  correct: number;
}

export interface DeckAnalyticsSource {
  // Uma linha por (baralho, carta), com o estado SM-2 da carta.
  deckCards(userId: string): Promise<DeckCardRow[]>;
  // Total x acertos por carta (para a acurácia de cada baralho).
  cardReviewStats(userId: string): Promise<CardReviewStat[]>;
}

export const DECK_ANALYTICS_SOURCE = Symbol('DECK_ANALYTICS_SOURCE');
