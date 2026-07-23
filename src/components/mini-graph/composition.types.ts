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
