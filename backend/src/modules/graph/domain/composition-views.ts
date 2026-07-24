// Subgrafo composto de um item, no MESMO vocabulário do grafo. É o que o mini-grafo
// desenha e o que o import injeta no grafo normal (fonte única — o "roll-up").
export type CompositionNodeType =
  | 'ASSUNTO'
  | 'TOPICO'
  | 'CONCEITO'
  | 'FLASHCARD'
  | 'QUESTION'
  | 'BARALHO'
  | 'PROVA';

export interface CompositionNode {
  id: string;
  type: CompositionNodeType;
  label: string;
}

// `rel` usa o vocabulário de relação do grafo (CONTEM/HERDA/PERTENCE_A).
export interface CompositionEdge {
  source: string;
  target: string;
  rel: string;
}

export interface CompositionGraph {
  nodes: CompositionNode[];
  edges: CompositionEdge[];
}
