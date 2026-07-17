// Published write capability of the graph context used by the AI context: makes
// a graph contain an ALREADY-EXISTING entity, creating its system node when it
// does not exist yet. Bound to the graph's AddExistingNode use-case in the AI
// module. This is what closes the 2.5% gap: cards without a node get one here.

export interface GraphNodeAttacher {
  attachExisting(
    userId: string,
    grafoId: string,
    tipoNode: string,
    entityId: string,
  ): Promise<void>;
}

export const GRAPH_NODE_ATTACHER = Symbol('GRAPH_NODE_ATTACHER');
