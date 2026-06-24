import type { CreateNodeInput } from '../services/node-creation';

// Persistence port for creating a node: its referenced entity plus the graph link.
export interface NodeCreationRepository {
  graphExists(grafoId: string, userId: string): Promise<boolean>;
  // Creates the typed entity and its NodeConhecimento link; returns the entity id.
  createNode(userId: string, grafoId: string, input: CreateNodeInput): Promise<{ nodeId: string }>;
}

export const NODE_CREATION_REPOSITORY = Symbol('NODE_CREATION_REPOSITORY');
