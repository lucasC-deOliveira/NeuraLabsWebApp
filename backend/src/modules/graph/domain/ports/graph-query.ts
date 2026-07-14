// Assunto (subject) tag of a graph — derived from its ASSUNTO nodes.
export interface GraphAssunto {
  id: string;
  nome: string;
  // Priority weight from the ASSUNTO node's connections (count × relation type).
  // Tags of a graph come sorted by this desc; the filter options carry 0.
  peso: number;
}

// Read model for an item in the user's graph list.
export interface GraphSummary {
  id: string;
  nome: string;
  descricao: string | null;
  parentGrafoId: string | null;
  tipoRelacaoPai: string | null;
  filhosCount: number;
  // Tags de assunto do grafo (nós ASSUNTO), para exibir e filtrar.
  assuntos: GraphAssunto[];
  dataCriacao: Date;
  dataAtualizacao: Date;
}

// Ordenação da lista: mais recentes (criação), atualizados recentemente,
// alfabética (A–Z) ou por número de subgrafos.
export type GraphSortField = 'recentes' | 'atualizados' | 'alfabetica' | 'subgrafos';

// Tipo do grafo: raiz (sem pai), subgrafo (com pai) ou todos.
export type GraphTypeFilter = 'todos' | 'raiz' | 'subgrafo';

// Query tipada e já validada para a listagem paginada (defaults aplicados).
export interface GraphListQuery {
  q?: string;
  tipo: GraphTypeFilter;
  sort: GraphSortField;
  createdFrom?: Date;
  createdTo?: Date;
  // Filtra grafos que contenham QUALQUER um destes assuntos (OR).
  assuntoIds?: string[];
  page: number; // 1-based
  pageSize: number;
}

// Página de resultados da listagem.
export interface GraphListPage {
  items: GraphSummary[];
  total: number;
  page: number;
  pageSize: number;
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
  listForUser(userId: string, query: GraphListQuery): Promise<GraphListPage>;
  findInfo(userId: string, grafoId: string): Promise<GraphInfoView | null>;
  // Distinct assuntos presentes como nós ASSUNTO nos grafos do usuário (alimenta o filtro).
  listAssuntos(userId: string): Promise<GraphAssunto[]>;
}

export const GRAPH_QUERY = Symbol('GRAPH_QUERY');
