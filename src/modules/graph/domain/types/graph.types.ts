// Pure graph model types (domain). No React, no HTTP client — the ubiquitous
// language of the graph feature. The HTTP boundary (@/lib/graph-api) re-exports
// these so the ~47 legacy importers keep their `@/lib/graph-api` import path,
// while every layer inside src/modules/graph speaks in these domain types.

export interface GrafoRefMeta {
  nome: string;
  nodeCount: number;
  tipoRelacao: string | null;
}

export interface GraphNodeType {
  id: string;
  label: string;
  type: string;
  nivelDominio: number;
  prioridadeRevisao: number;
  parentId?: string;
  pergunta?: string;
  posicaoX?: number;
  posicaoY?: number;
  grafoRefMeta?: GrafoRefMeta;
  /** Assunto-raiz do grafo: fixo no centro, ancora o layout, não-deletável. */
  isRoot?: boolean;
}

export interface GraphEdgeType {
  source: string;
  target: string;
  type: string;
  peso: number;
}

export interface EdgeView {
  id: string;
  source: string;
  target: string;
  tipoRelacao: string;
  peso: number;
  sourceLabel: string;
  targetLabel: string;
}

// Tag de assunto de um grafo (derivada dos nós ASSUNTO).
export interface GraphAssunto {
  id: string;
  nome: string;
}

export interface GrafoInfo {
  id: string;
  nome: string;
  descricao?: string | null;
  parentGrafoId?: string | null;
  tipoRelacaoPai?: string | null;
  filhosCount?: number;
  assuntos?: GraphAssunto[];
  dataCriacao?: string;
  dataAtualizacao?: string;
}

// Ordenação e filtro de tipo da listagem de grafos (espelham o backend).
export type GraphSortField = "recentes" | "atualizados" | "alfabetica" | "subgrafos";
export type GraphTypeFilter = "todos" | "raiz" | "subgrafo";

// Parâmetros de busca/filtro/ordenação/paginação enviados à listagem.
export interface GraphListParams {
  q?: string;
  tipo?: GraphTypeFilter;
  sort?: GraphSortField;
  createdFrom?: string; // ISO date
  createdTo?: string; // ISO date
  assuntoIds?: string[]; // filtra grafos com QUALQUER um destes assuntos
  page?: number;
  pageSize?: number;
}

// Página de resultados da listagem (espelha GraphListPage do backend).
export interface GraphListResult {
  items: GrafoInfo[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GrafoInfoDetail {
  nome: string;
  descricao?: string;
  parentGrafoId: string | null;
  parentNome: string | null;
  tipoRelacaoPai: string | null;
  filhosCount: number;
}

export interface GraphVisualState {
  zoom: number;
  pan: { x: number; y: number };
  positions?: Record<string, { x: number; y: number }>;
}
