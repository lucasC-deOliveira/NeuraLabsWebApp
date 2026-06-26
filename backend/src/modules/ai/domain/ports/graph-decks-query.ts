export interface GraphDeck {
  id: string;
  titulo: string;
  flashcardCount: number;
}

// Read port: the decks reachable from a graph — directly and via referenced
// subgraphs — with their flashcard counts.
export interface GraphDecksQuery {
  listDecks(userId: string, grafoId: string): Promise<GraphDeck[]>;
}

export const GRAPH_DECKS_QUERY = Symbol('GRAPH_DECKS_QUERY');
