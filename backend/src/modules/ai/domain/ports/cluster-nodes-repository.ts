import type { ClusterNode } from '../services/cluster-context';

// Read port: the content of a set of nodes (by referenciaId) for cluster
// summarization, ordered ASSUNTO → TOPICO → CONCEITO → NOTA.
export interface ClusterNodesRepository {
  loadClusterContent(userId: string, grafoId: string, nodeIds: string[]): Promise<ClusterNode[]>;
}

export const CLUSTER_NODES_REPOSITORY = Symbol('CLUSTER_NODES_REPOSITORY');
