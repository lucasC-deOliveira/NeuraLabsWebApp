export interface ImportResult {
  nodes: number;
  edges: number;
  reused: number;
}

// Persistence port for importing a graph from a JSON payload (nodes + edges,
// reusing existing entities by name). The payload is validated by the adapter.
export interface GraphImportRepository {
  importFromJson(userId: string, grafoId: string, payload: unknown): Promise<ImportResult>;
}

export const GRAPH_IMPORT_REPOSITORY = Symbol('GRAPH_IMPORT_REPOSITORY');
