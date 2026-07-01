// Use-cases: create / update / delete a graph edge (relation). Orchestrate the
// domain validation and the GraphEdgesPort. Pure application logic (no React).
// Throw EdgeValidationError with the domain error CODE before hitting the port.
import {
  validateNewEdge,
  validateEditEdge,
  type EdgeFormError,
  type EdgeFormValues,
} from "../../domain/services/edge-form-validation";
import type { GraphEdgesPort } from "../ports/graph-edges.port";

export class EdgeValidationError extends Error {
  constructor(readonly code: EdgeFormError) {
    super(code);
    this.name = "EdgeValidationError";
  }
}

export async function createGraphEdge(
  port: GraphEdgesPort,
  grafoId: string,
  form: EdgeFormValues,
): Promise<void> {
  const error = validateNewEdge(form);
  if (error) throw new EdgeValidationError(error);
  await port.createEdge(grafoId, {
    sourceNodeId: form.sourceNodeId,
    targetNodeId: form.targetNodeId,
    tipoRelacao: form.tipoRelacao,
    peso: form.peso,
  });
}

export async function updateGraphEdge(
  port: GraphEdgesPort,
  edgeId: string | null,
  grafoId: string,
  form: EdgeFormValues,
): Promise<void> {
  const error = validateEditEdge(form, Boolean(edgeId));
  if (error || !edgeId) throw new EdgeValidationError(error ?? "edge-incomplete");
  await port.updateEdge(edgeId, grafoId, { tipoRelacao: form.tipoRelacao, peso: form.peso });
}

export async function deleteGraphEdge(
  port: GraphEdgesPort,
  edgeId: string,
  grafoId: string,
): Promise<void> {
  await port.deleteEdge(edgeId, grafoId);
}
