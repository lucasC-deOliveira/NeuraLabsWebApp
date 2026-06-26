// Persistence port for the knowledge graph aggregate's identity (creation + name).
export interface GraphRepository {
  // Creates a graph plus its root subject (ASSUNTO) that anchors the layout at (0,0).
  create(userId: string, name: string, descricao: string | null): Promise<{ id: string }>;
  // Renames the graph; the root subject's name mirrors the graph name.
  rename(userId: string, grafoId: string, name: string): Promise<void>;
}

export const GRAPH_REPOSITORY = Symbol('GRAPH_REPOSITORY');
