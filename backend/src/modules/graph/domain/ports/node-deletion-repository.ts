// A graph node selected for deletion: the link id plus the entity it references.
export interface DeletableNode {
  id: string;
  tipoNode: string;
  referenciaId: string;
}

// Persistence port for deleting individual nodes (optionally their neighbors).
export interface NodeDeletionRepository {
  // Whether refId is the root subject of some graph owned by the user.
  isRootSubject(userId: string, refId: string): Promise<boolean>;
  findNode(userId: string, refId: string, grafoId?: string): Promise<DeletableNode | null>;
  findConnectedNodes(userId: string, nodeId: string): Promise<DeletableNode[]>;
  // Deletes each node's edges, performance rows, referenced entity and link.
  deleteNodes(nodes: DeletableNode[]): Promise<void>;
}

export const NODE_DELETION_REPOSITORY = Symbol('NODE_DELETION_REPOSITORY');
