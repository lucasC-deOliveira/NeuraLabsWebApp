// Conceito de cada flashcard SEGUNDO O GRAFO (arestas FLASHCARD→CONCEITO), não o
// relacional (nulo para o acervo importado). É o que dá liga ao interleaving: sem o
// conceito, todas as revisões caem num grupo só e não há como intercalar.
export interface CardConceptSource {
  conceptsFor(userId: string, flashcardIds: string[]): Promise<Map<string, string>>;
}

export const CARD_CONCEPT_SOURCE = Symbol('CARD_CONCEPT_SOURCE');
