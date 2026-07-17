// Maps a graph node's type to its "expand" action. One entry point, three
// behaviours: a BARALHO classifies its flashcards into topics/concepts
// (populate), a structural node generates AI sub-nodes (expand), and a FLASHCARD
// gets linked to the concepts it defines (classify). Types with no natural
// expansion (PROVA, QUESTION, EDITAL, GRAFO_REF) return null and show no option.

export type ExpandKind = "populate" | "expand" | "classify";

export interface ExpandAction {
  kind: ExpandKind;
  label: string;
}

const ACTION_BY_TYPE: Record<string, ExpandAction> = {
  BARALHO: { kind: "populate", label: "Expandir com IA" },
  ASSUNTO: { kind: "expand", label: "Expandir com IA" },
  TOPICO: { kind: "expand", label: "Expandir com IA" },
  CONCEITO: { kind: "expand", label: "Expandir com IA" },
  NOTA: { kind: "expand", label: "Expandir com IA" },
  FLASHCARD: { kind: "classify", label: "Classificar em conceitos" },
};

/** The expand action for a node type, or null when the type has no expansion. */
export function expandActionFor(nodeType: string | null | undefined): ExpandAction | null {
  if (!nodeType) return null;
  return ACTION_BY_TYPE[nodeType] ?? null;
}
