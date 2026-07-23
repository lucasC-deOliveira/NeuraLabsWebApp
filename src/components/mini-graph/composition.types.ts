// Subgrafo composto de um item — espelha o retorno de GET /graph/composition.
// Mesmo vocabulário do grafo (type/rel), pra o mini-grafo e o grafo se alinharem.
export type CompositionNodeType =
  | "ASSUNTO"
  | "TOPICO"
  | "CONCEITO"
  | "FLASHCARD"
  | "QUESTION"
  | "BARALHO"
  | "PROVA";

export type CompositionTipo = "flashcard" | "questao" | "baralho" | "prova";

export interface CompositionNode {
  id: string;
  type: CompositionNodeType;
  label: string;
}

export interface CompositionEdge {
  source: string;
  target: string;
  rel: string;
}

export interface CompositionGraph {
  nodes: CompositionNode[];
  edges: CompositionEdge[];
}

// tipo (rota/composição) ↔ type (vocabulário do grafo). Só os 4 tipos que compõem.
export const TIPO_TO_TYPE: Record<CompositionTipo, CompositionNodeType> = {
  flashcard: "FLASHCARD",
  questao: "QUESTION",
  baralho: "BARALHO",
  prova: "PROVA",
};

export const TYPE_TO_TIPO: Partial<Record<CompositionNodeType, CompositionTipo>> = {
  FLASHCARD: "flashcard",
  QUESTION: "questao",
  BARALHO: "baralho",
  PROVA: "prova",
};
