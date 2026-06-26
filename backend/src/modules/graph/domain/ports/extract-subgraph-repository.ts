import type { ExtractEdge, Point } from '../services/subgraph-extraction';

export interface ExtractSubgraphInput {
  nodeIds: string[];
  nome: string;
  tipoRelacao: string;
}

// A node eligible for extraction (its link id and position in the parent).
export interface ExtractableNode {
  id: string;
  posicaoX: number | null;
  posicaoY: number | null;
}

// Fully-planned extraction: which nodes move, where the GRAFO_REF lands, and
// which boundary edges to rewire.
export interface ExtractSubgraphCommand {
  userId: string;
  parentGrafoId: string;
  nome: string;
  tipoRelacao: string;
  nodeRowIds: string[];
  innerNodeIds: Set<string>;
  center: Point;
  externalEdges: ExtractEdge[];
}

export interface ExtractSubgraphResult {
  grafoId: string;
  grafoRefNodeId: string;
  movedCount: number;
  rewiredEdgeCount: number;
}

export interface ExtractSubgraphRepository {
  parentExists(parentGrafoId: string, userId: string): Promise<boolean>;
  findExtractableNodes(
    userId: string,
    parentGrafoId: string,
    referenciaIds: string[],
  ): Promise<ExtractableNode[]>;
  findEdgesTouching(parentGrafoId: string, nodeRowIds: string[]): Promise<ExtractEdge[]>;
  extract(command: ExtractSubgraphCommand): Promise<ExtractSubgraphResult>;
}

export const EXTRACT_SUBGRAPH_REPOSITORY = Symbol('EXTRACT_SUBGRAPH_REPOSITORY');
