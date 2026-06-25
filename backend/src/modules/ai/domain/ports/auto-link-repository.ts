import type { AutoLinkNode } from '../services/auto-link-suggestions';

export interface AutoLinkData {
  nodes: AutoLinkNode[];
  // Existing edges as "sourceRef:targetRef" pairs, to avoid suggesting duplicates.
  existingPairs: Set<string>;
}

// Read port for the auto-link feature: the graph's linkable nodes and its edges.
export interface AutoLinkRepository {
  loadAutoLinkData(userId: string, grafoId: string): Promise<AutoLinkData>;
}

export const AUTO_LINK_REPOSITORY = Symbol('AUTO_LINK_REPOSITORY');
