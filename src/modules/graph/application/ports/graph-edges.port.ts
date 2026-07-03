// Port (application boundary) for edge (relation) write over the HTTP edge.
// Only infra/ implements it (ACL over @/lib/graph-api). No React, no @/lib here.

export interface CreateEdgeData {
  sourceNodeId: string;
  targetNodeId: string;
  tipoRelacao: string;
  peso?: number;
}

export interface GraphEdgesPort {
  createEdge(grafoId: string, data: CreateEdgeData): Promise<{ success: boolean; edgeId: string }>;
  updateEdge(
    edgeId: string,
    grafoId: string,
    data: { tipoRelacao?: string; peso?: number },
  ): Promise<{ success: boolean }>;
  deleteEdge(edgeId: string, grafoId: string): Promise<{ success: boolean }>;
}
