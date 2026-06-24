// Persistence port for a graph's serialized visual state (camera, layout, etc.).
export interface GraphVisualStateRepository {
  save(userId: string, grafoId: string, serialized: string): Promise<void>;
  // Returns the raw stored JSON string, or null when none is set / not owned.
  loadRaw(userId: string, grafoId: string): Promise<string | null>;
}

export const GRAPH_VISUAL_STATE_REPOSITORY = Symbol('GRAPH_VISUAL_STATE_REPOSITORY');
