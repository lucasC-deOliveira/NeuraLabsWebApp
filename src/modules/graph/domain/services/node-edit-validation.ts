// Required-field rules for editing a graph node, by node type. Pure domain logic
// (no React, no HTTP). Returns a stable error CODE (English/internal) — the
// presentation layer maps it to the user-facing pt-BR message. Shared by the
// edit and create flows to avoid duplicating the rules.

export type NodeEditFields = Record<string, string>;

export type NodeEditError =
  | "flashcard-missing-fields"
  | "nota-missing-title"
  | "nota-missing-subtype"
  | "nota-missing-source"
  | "nota-missing-content"
  | "missing-name";

function validateFlashcard(fields: NodeEditFields): NodeEditError | null {
  if (!fields.pergunta?.trim() || !fields.resposta?.trim()) return "flashcard-missing-fields";
  return null;
}

function validateNota(fields: NodeEditFields): NodeEditError | null {
  if (!fields.titulo?.trim()) return "nota-missing-title";
  if (!fields.subtipo) return "nota-missing-subtype";
  if (fields.tipoNota === "LITERATURA" && !fields.fonte?.trim()) return "nota-missing-source";
  if (!fields.conteudo?.trim()) return "nota-missing-content";
  return null;
}

/**
 * Validates a node's editable fields for its type.
 * @example validateNodeEditFields("CONCEITO", { nome: "" }) // => "missing-name"
 * @returns the first violated rule's code, or null when the fields are valid.
 */
export function validateNodeEditFields(group: string, fields: NodeEditFields): NodeEditError | null {
  if (group === "FLASHCARD") return validateFlashcard(fields);
  if (group === "NOTA") return validateNota(fields);
  return fields.nome?.trim() ? null : "missing-name";
}
