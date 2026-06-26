// Persistence port for creating a deck (Baralho) inside a graph.
export interface CreateDeckRepository {
  graphExists(grafoId: string, userId: string): Promise<boolean>;
  // Whether every id belongs to a flashcard owned by the user.
  allFlashcardsOwned(userId: string, flashcardIds: string[]): Promise<boolean>;
  // Creates the deck, its BARALHO node and CONTEM edges to each flashcard node;
  // returns the new deck (Baralho) id.
  createDeck(
    userId: string,
    grafoId: string,
    titulo: string,
    flashcardIds: string[],
  ): Promise<string>;
}

export const CREATE_DECK_REPOSITORY = Symbol('CREATE_DECK_REPOSITORY');
