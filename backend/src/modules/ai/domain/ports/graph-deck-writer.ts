// Published capability of the graph context: creates a deck (BARALHO) from a set
// of flashcard nodes. Bound to the graph's CreateDeck use-case in the AI module.
export interface GraphDeckWriter {
  createBaralho(
    userId: string,
    grafoId: string,
    nome: string,
    flashcardIds: string[],
  ): Promise<void>;
}

export const GRAPH_DECK_WRITER = Symbol('GRAPH_DECK_WRITER');
