// Shared write helpers for the cascading-write use-cases (expand, fill, populate,
// build-graph). Node/edge creation that tolerates failures lives here so the
// orchestration use-cases stay free of duplicated try/catch boilerplate.
import type { GraphNodeInput, GraphNodeWriter } from '../domain/ports/graph-node-writer';
import type { GraphEdgeInput, GraphEdgeWriter } from '../domain/ports/graph-edge-writer';

/** Creates a node, returning its id or null when creation fails. */
export async function createNodeSafe(
  writer: GraphNodeWriter,
  userId: string,
  grafoId: string,
  input: GraphNodeInput,
): Promise<string | null> {
  try {
    const { nodeId } = await writer.createNode(userId, grafoId, input);
    return nodeId;
  } catch {
    return null;
  }
}

/** Creates an edge, silently skipping duplicates/invalid relations. */
export async function tryCreateEdge(
  writer: GraphEdgeWriter,
  userId: string,
  grafoId: string,
  edge: GraphEdgeInput,
): Promise<void> {
  try {
    await writer.createEdge(userId, grafoId, edge);
  } catch {
    // duplicate/invalid edge: skip it
  }
}
