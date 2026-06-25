// Published write capability of the graph context used by the AI context: creates
// a single node (entity + graph link). Bound to the graph's CreateNode use-case
// in the AI module.
export interface GraphNodeInput {
  tipoNode: string;
  nome: string;
  descricao: string;
}

export interface GraphNodeWriter {
  createNode(userId: string, grafoId: string, input: GraphNodeInput): Promise<{ nodeId: string }>;
}

export const GRAPH_NODE_WRITER = Symbol('GRAPH_NODE_WRITER');
