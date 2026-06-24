// Read model for the deck-builder picker: a user's flashcards with their concept.
export interface FlashcardPickerItem {
  id: string;
  pergunta: string;
  conceito: string | null;
}

// Read model for studying a deck: its title and full set of cards.
export interface DeckCardView {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string | null;
}
export interface DeckCards {
  titulo: string;
  cards: DeckCardView[];
}

// Read port for deck/flashcard projections used by the graph UI.
export interface DeckQuery {
  listUserFlashcards(userId: string): Promise<FlashcardPickerItem[]>;
  findDeckForStudy(userId: string, baralhoId: string): Promise<DeckCards | null>;
}

export const DECK_QUERY = Symbol('DECK_QUERY');
