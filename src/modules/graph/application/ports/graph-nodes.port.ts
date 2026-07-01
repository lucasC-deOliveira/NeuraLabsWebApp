// Port (application boundary) for node read/write over the HTTP edge.
// Only infra/ implements it (ACL over @/lib/graph-api). No React, no @/lib here.

export type NodeDetails = Record<string, string | null>;

export interface GraphNodesPort {
  getNodeDetails(group: string, nodeId: string): Promise<NodeDetails | null>;
  updateGraphNode(
    group: string,
    nodeId: string,
    data: Record<string, unknown>,
    grafoId: string,
  ): Promise<{ success: boolean }>;
  addNodeToGraph(
    grafoId: string,
    tipoNode: string,
    data: Record<string, unknown>,
  ): Promise<{ success: boolean; nodeId: string }>;
  createBaralhoNode(
    grafoId: string,
    titulo: string,
    flashcardIds: string[],
  ): Promise<{ success: boolean; nodeId: string }>;
}
