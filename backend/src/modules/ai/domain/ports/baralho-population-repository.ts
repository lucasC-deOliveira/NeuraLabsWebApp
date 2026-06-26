export interface BaralhoFlashcard {
  id: string;
  pergunta: string;
  resposta: string;
}

export interface BaralhoForPopulation {
  titulo: string;
  flashcards: BaralhoFlashcard[];
}

// Read port for populating a graph from a deck: graph/deck existence, the deck's
// flashcards and which of them already exist as FLASHCARD nodes in the graph.
export interface BaralhoPopulationRepository {
  graphExists(userId: string, grafoId: string): Promise<boolean>;
  loadBaralho(userId: string, baralhoId: string): Promise<BaralhoForPopulation | null>;
  loadFlashcardNodeRefs(grafoId: string, flashcardIds: string[]): Promise<Set<string>>;
}

export const BARALHO_POPULATION_REPOSITORY = Symbol('BARALHO_POPULATION_REPOSITORY');
