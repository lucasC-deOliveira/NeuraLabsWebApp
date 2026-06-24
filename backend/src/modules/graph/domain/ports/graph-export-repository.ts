export interface ExportGraphHeader {
  id: string;
  nome: string;
}

// A node row as stored, before its per-type content is attached.
export interface ExportNodeRow {
  tipoNode: string;
  referenciaId: string;
  posicaoX: number | null;
  posicaoY: number | null;
  nivelDominio: number;
}

// Export contract (mirrors the vault import format): ref = referenciaId.
export type ExportNode = Record<string, unknown>;
export interface ExportEdge {
  origem: string;
  destino: string;
  relacao: string;
  peso: number;
}
export interface ExportPayload {
  grafo: ExportGraphHeader;
  nodes: ExportNode[];
  edges: ExportEdge[];
}

export interface GraphExportRepository {
  findGraph(grafoId: string, userId: string): Promise<ExportGraphHeader | null>;
  listNodes(grafoId: string, userId: string): Promise<ExportNodeRow[]>;
}

export const GRAPH_EXPORT_REPOSITORY = Symbol('GRAPH_EXPORT_REPOSITORY');
