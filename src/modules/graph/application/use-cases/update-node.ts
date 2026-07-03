// Use-case: update a graph node. Orchestrates the domain validation and the
// GraphNodesPort. Pure application logic (no React). Throws NodeValidationError
// with the domain error CODE when the fields are invalid, before hitting the port.
import {
  validateNodeEditFields,
  type NodeEditError,
  type NodeEditFields,
} from "../../domain/services/node-edit-validation";
import type { GraphNodesPort } from "../ports/graph-nodes.port";

export class NodeValidationError extends Error {
  constructor(readonly code: NodeEditError) {
    super(code);
    this.name = "NodeValidationError";
  }
}

export interface UpdateNodeInput {
  grafoId: string;
  group: string;
  nodeId: string;
  fields: NodeEditFields;
}

const blankToNull = (v?: string): string | null => v?.trim() || null;
const blankToUndef = (v?: string): string | undefined => v || undefined;

/** Maps the raw form fields to the node update payload (trim + null-empty). */
export function buildNodeUpdatePayload(fields: NodeEditFields): Record<string, unknown> {
  return {
    nome: fields.nome?.trim(),
    descricao: blankToNull(fields.descricao),
    pergunta: fields.pergunta?.trim(),
    resposta: fields.resposta?.trim(),
    conteudo: fields.conteudo?.trim(),
    titulo: fields.titulo?.trim(),
    tipoNota: fields.tipoNota,
    subtipo: blankToUndef(fields.subtipo),
    fonte: blankToNull(fields.fonte),
  };
}

export async function updateNode(port: GraphNodesPort, input: UpdateNodeInput): Promise<void> {
  const error = validateNodeEditFields(input.group, input.fields);
  if (error) throw new NodeValidationError(error);
  await port.updateGraphNode(input.group, input.nodeId, buildNodeUpdatePayload(input.fields), input.grafoId);
}
