import type { MergeEdge } from '../services/edge-merge';

// Read/write port for merging duplicate nodes: resolving node link ids, loading a
// node's adjacent edges, moving edges to the kept node and deleting the rest.
export interface DuplicateMergeRepository {
  findNodeLinkId(userId: string, grafoId: string, refId: string): Promise<string | null>;
  loadAdjacentEdges(ncId: string): Promise<MergeEdge[]>;
  moveEdges(moveSrc: string[], moveTgt: string[], keepNcId: string): Promise<number>;
  deleteEdgesOf(ncId: string): Promise<void>;
}

export const DUPLICATE_MERGE_REPOSITORY = Symbol('DUPLICATE_MERGE_REPOSITORY');
