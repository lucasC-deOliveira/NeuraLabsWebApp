import type { PositionUpdate } from '../services/position-plan';

// Persistence port for node positions within a graph.
export interface GraphPositionRepository {
  applyPositions(userId: string, grafoId: string, updates: PositionUpdate[]): Promise<void>;
}

export const GRAPH_POSITION_REPOSITORY = Symbol('GRAPH_POSITION_REPOSITORY');
