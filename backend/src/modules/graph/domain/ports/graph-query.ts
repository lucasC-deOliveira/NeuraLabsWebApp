// Read model for an item in the user's graph list.
export interface GraphSummary {
  id: string;
  nome: string;
  descricao: string | null;
  parentGrafoId: string | null;
  tipoRelacaoPai: string | null;
  filhosCount: number;
  dataCriacao: Date;
  dataAtualizacao: Date;
}

// Read model for a single graph's info panel (resolves the parent's name).
export interface GraphInfoView {
  nome: string;
  descricao?: string;
  parentGrafoId: string | null;
  parentNome: string | null;
  tipoRelacaoPai: string | null;
  filhosCount: number;
}

// Read port for graph metadata (separate from the write aggregate).
export interface GraphQuery {
  listForUser(userId: string): Promise<GraphSummary[]>;
  findInfo(userId: string, grafoId: string): Promise<GraphInfoView | null>;
}

export const GRAPH_QUERY = Symbol('GRAPH_QUERY');
