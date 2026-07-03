// Import payload model (nodes + edges) validated/normalized before hitting the HTTP edge.
// Domain-owned so the parser (domain) and the port (application) can both reference it.

export interface ImportGraphNode {
  ref: string;
  tipo: string;
  nome?: string;
  descricao?: string | null;
  pergunta?: string;
  resposta?: string;
  titulo?: string;
  conteudo?: string;
  tipoNota?: string;
  subtipo?: string;
  fonte?: string | null;
  texto?: string;
}

export interface ImportGraphEdge {
  origem: string;
  destino: string;
  relacao: string;
  peso?: number;
}

export interface ImportGraphPayload {
  nodes: ImportGraphNode[];
  edges: ImportGraphEdge[];
}
