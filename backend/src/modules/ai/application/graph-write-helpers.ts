// Shared write helpers for the cascading-write use-cases (expand, fill, populate,
// build-graph). Node/edge creation that tolerates failures lives here so the
// orchestration use-cases stay free of duplicated try/catch boilerplate.
import type { GraphNodeInput, GraphNodeWriter } from '../domain/ports/graph-node-writer';
import type { GraphEdgeInput, GraphEdgeWriter } from '../domain/ports/graph-edge-writer';
import { nodeNameKey } from '../domain/services/node-name-key';

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

/** Reuses an existing structural node by name (via the index) or creates it. */
export async function findOrCreateNode(
  writer: GraphNodeWriter,
  nameIndex: Map<string, string>,
  userId: string,
  grafoId: string,
  tipoNode: string,
  nome: string,
  descricao = '',
): Promise<{ nodeId: string; created: boolean }> {
  const key = nodeNameKey(tipoNode, nome);
  const existing = nameIndex.get(key);
  if (existing) return { nodeId: existing, created: false };
  const { nodeId } = await writer.createNode(userId, grafoId, { tipoNode, nome, descricao });
  nameIndex.set(key, nodeId);
  return { nodeId, created: true };
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
