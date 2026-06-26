// Input for creating a subgraph under a parent graph.
export interface CreateSubgraphInput {
  nome: string;
  descricao?: string;
  tipoRelacao: string;
  posX?: number;
  posY?: number;
}

// Persistence port for creating a child graph plus its GRAFO_REF node in the parent.
export interface CreateSubgraphRepository {
  parentExists(parentGrafoId: string, userId: string): Promise<boolean>;
  createSubgraph(
    userId: string,
    parentGrafoId: string,
    input: CreateSubgraphInput,
  ): Promise<{ grafoId: string; grafoRefNodeId: string }>;
}

export const CREATE_SUBGRAPH_REPOSITORY = Symbol('CREATE_SUBGRAPH_REPOSITORY');
