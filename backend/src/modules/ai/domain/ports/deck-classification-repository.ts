// Read port for the chunked deck classification (Fase 6): the deck's FULL card
// list (no cap — decks with thousands of cards are the point of chunking) and
// which cards are already classified. "Classified" is global to the user, not
// per graph: a card whose FLASHCARD node has a DEFINE edge to any CONCEITO.

export interface DeckCard {
  id: string;
  pergunta: string;
  resposta: string;
}

export interface DeckForClassification {
  titulo: string;
  cards: DeckCard[];
}

export interface DeckClassificationRepository {
  graphExists(userId: string, grafoId: string): Promise<boolean>;
  loadDeck(userId: string, baralhoId: string): Promise<DeckForClassification | null>;
  loadClassifiedCardIds(userId: string, cardIds: string[]): Promise<Set<string>>;
}

export const DECK_CLASSIFICATION_REPOSITORY = Symbol('DECK_CLASSIFICATION_REPOSITORY');
