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

export interface GrafoInfo {
  id: string;
  nome: string;
  descricao?: string | null;
  parentGrafoId?: string | null;
  tipoRelacaoPai?: string | null;
  filhosCount?: number;
  dataCriacao?: string;
  dataAtualizacao?: string;
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
