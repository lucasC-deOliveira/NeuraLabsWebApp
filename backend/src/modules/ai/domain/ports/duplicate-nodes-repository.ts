// A graph node eligible for duplicate detection, with its short description.
export interface DuplicateGraphNode {
  id: string;
  nome: string;
  tipo: string;
  desc: string;
}

// Read port: the structural nodes (ASSUNTO/TOPICO/CONCEITO) of a graph.
export interface DuplicateNodesRepository {
  loadGraphNodes(userId: string, grafoId: string): Promise<DuplicateGraphNode[]>;
}

export const DUPLICATE_NODES_REPOSITORY = Symbol('DUPLICATE_NODES_REPOSITORY');
