// Published capability of the graph context: deletes a node (and its links).
// Bound to the graph's DeleteNode use-case in the AI module.
export interface GraphNodeDeleter {
  deleteNode(userId: string, nodeId: string, grafoId: string): Promise<void>;
}

export const GRAPH_NODE_DELETER = Symbol('GRAPH_NODE_DELETER');
