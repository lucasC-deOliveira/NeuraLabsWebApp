// Use-cases: create a knowledge node (with its relation edges) and create a deck.
// Orchestrate the create-node domain rules + the node/edge ports. Pure application
// logic (no React). Throws CreateNodeValidationError with the domain CODE.
import {
  validateCreateNodeForm,
  buildCreateNodePayload,
  type CreateNodeError,
  type CreateNodeFormValues,
} from "../../domain/services/create-node-form";
import {
  buildCreatedNodeEdges,
  type AcceptedSuggestion,
  type PendingEdge,
} from "../../domain/services/node-creation-edges";
import type { GraphNodesPort } from "../ports/graph-nodes.port";
import type { GraphEdgesPort } from "../ports/graph-edges.port";

export class CreateNodeValidationError extends Error {
  constructor(readonly code: CreateNodeError) {
    super(code);
    this.name = "CreateNodeValidationError";
  }
}

type NodeCreationPort = Pick<GraphNodesPort, "addNodeToGraph"> & Pick<GraphEdgesPort, "createEdge">;

export interface CreateGraphNodeInput {
  grafoId: string;
  type: string;
  form: CreateNodeFormValues;
  topicoAssuntos: Array<{ assuntoId: string; relacao: string; peso: number }>;
  conceitoTopicos: Array<{ topicoId: string; relacao: string; peso: number }>;
  flashcardConceitos: Array<{ conceitoId: string; relacao: string; peso: number }>;
  notaConceitos: Array<{ conceitoId: string; relacao: string; peso: number }>;
  acceptedSuggestions: AcceptedSuggestion[];
  notaTextoBrutoId: string;
}

async function createOneEdge(
  port: NodeCreationPort,
  grafoId: string,
  newNodeId: string,
  edge: PendingEdge,
): Promise<boolean> {
  try {
    await port.createEdge(grafoId, {
      sourceNodeId: edge.sourceNodeId ?? newNodeId,
      targetNodeId: edge.targetNodeId,
      tipoRelacao: edge.tipoRelacao,
      peso: edge.peso,
    });
    return true;
  } catch {
    return false; // falha individual não aborta o conjunto
  }
}

async function createEdges(
  port: NodeCreationPort,
  grafoId: string,
  newNodeId: string,
  edges: PendingEdge[],
): Promise<number> {
  let created = 0;
  for (const edge of edges) if (await createOneEdge(port, grafoId, newNodeId, edge)) created++;
  return created;
}

export async function createGraphNode(
  port: NodeCreationPort,
  input: CreateGraphNodeInput,
): Promise<{ nodeId: string; createdEdges: number }> {
  const error = validateCreateNodeForm(input.type, input.form);
  if (error) throw new CreateNodeValidationError(error);
  const { nodeId } = await port.addNodeToGraph(input.grafoId, input.type, buildCreateNodePayload(input.type, input.form));
  const edges = buildCreatedNodeEdges({ ...input, newNodeId: nodeId });
  const createdEdges = await createEdges(port, input.grafoId, nodeId, edges);
  return { nodeId, createdEdges };
}

export async function createDeck(
  port: Pick<GraphNodesPort, "createBaralhoNode">,
  grafoId: string,
  titulo: string,
  flashcardIds: string[],
): Promise<string> {
  const { nodeId } = await port.createBaralhoNode(grafoId, titulo.trim(), flashcardIds);
  return nodeId;
}
