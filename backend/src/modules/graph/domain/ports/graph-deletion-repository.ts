import type { GraphMember } from '../services/graph-deletion-plan';

// Ordered execution plan for deleting a graph's member entities.
export interface GraphDeletionExecution {
  // Member entities to delete, in dependency-safe order.
  ordered: GraphMember[];
  // Concept ids whose flashcards must be detached first (when keeping flashcards).
  detachConceptIds: string[];
}

// Persistence port for deleting a knowledge graph and the entities it owns.
export interface GraphDeletionRepository {
  graphExists(grafoId: string, userId: string): Promise<boolean>;
  listMembers(grafoId: string, userId: string): Promise<GraphMember[]>;
  // Whether the entity is also a member of another graph owned by the user.
  existsInOtherGraph(
    userId: string,
    tipoNode: string,
    referenciaId: string,
    exceptGrafoId: string,
  ): Promise<boolean>;
  deleteGraph(userId: string, grafoId: string, plan: GraphDeletionExecution): Promise<void>;
}

export const GRAPH_DELETION_REPOSITORY = Symbol('GRAPH_DELETION_REPOSITORY');
