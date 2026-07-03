// Validation rules for the edge (relation) create/edit form. Pure domain logic
// (no React, no HTTP). Returns a stable error CODE (English/internal); the
// presentation layer maps it to the user-facing pt-BR message.

export interface EdgeFormValues {
  sourceNodeId: string;
  targetNodeId: string;
  tipoRelacao: string;
  peso: number;
}

export type EdgeFormError =
  | "edge-missing-fields"
  | "edge-same-node"
  | "edge-incomplete";

/** Rules for creating a new edge: all three fields required, no self-loop. */
export function validateNewEdge(form: EdgeFormValues): EdgeFormError | null {
  if (!form.sourceNodeId || !form.targetNodeId || !form.tipoRelacao) return "edge-missing-fields";
  if (form.sourceNodeId === form.targetNodeId) return "edge-same-node";
  return null;
}

/** Rules for editing an edge: the selected edge and a relation type are required. */
export function validateEditEdge(form: EdgeFormValues, hasSelectedEdge: boolean): EdgeFormError | null {
  if (!hasSelectedEdge || !form.tipoRelacao) return "edge-incomplete";
  return null;
}
