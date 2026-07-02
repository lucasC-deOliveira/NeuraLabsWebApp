// Port (application boundary) for subgraph creation/extraction over the HTTP edge.
// Only infra/ implements it (ACL over @/lib/graph-api). No React, no @/lib here.

export interface CreateSubgrafoInput {
  nome: string;
  descricao?: string;
  tipoRelacao: string;
  posX?: number;
  posY?: number;
}

export interface ExtractSubgrafoInput {
  nodeIds: string[];
  nome: string;
  tipoRelacao: string;
}

export interface GraphSubgrafoPort {
  createSubgrafo(
    parentGrafoId: string,
    input: CreateSubgrafoInput,
  ): Promise<{ grafoId: string; grafoRefNodeId: string }>;
  extractNodesToSubgrafo(
    parentGrafoId: string,
    input: ExtractSubgrafoInput,
  ): Promise<{ grafoId: string; grafoRefNodeId: string; movedCount: number; rewiredEdgeCount: number }>;
}
