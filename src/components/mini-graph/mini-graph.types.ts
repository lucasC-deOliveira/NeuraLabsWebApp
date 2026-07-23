// Uma conexão de um item (flashcard/baralho/prova/questão) com a hierarquia de
// conteúdo: o conceito e seus pais tópico → assunto. Só os nomes importam aqui.
export interface ConceptConnection {
  conceito: string;
  topico: string;
  assunto: string;
}

// Nó posicionado do mini-grafo. `layer`: 0 item · 1 conceito · 2 tópico · 3 assunto.
export interface MiniNode {
  id: string;
  label: string;
  layer: number;
  x: number;
  y: number;
}

export interface MiniEdge {
  from: string;
  to: string;
}

export interface MiniGraphModel {
  nodes: MiniNode[];
  edges: MiniEdge[];
  width: number;
  height: number;
}
