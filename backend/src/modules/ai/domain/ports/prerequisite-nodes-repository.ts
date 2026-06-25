import type { PrereqNode } from '../services/missing-prerequisites';

// Read port: the graph's TOPICO/CONCEITO nodes — the candidates a missing
// prerequisite could connect to.
export interface PrerequisiteNodesRepository {
  loadNodes(userId: string, grafoId: string): Promise<PrereqNode[]>;
}

export const PREREQUISITE_NODES_REPOSITORY = Symbol('PREREQUISITE_NODES_REPOSITORY');
