// Pure logic for the edges created alongside a NEW node in the create-node flow.
// Each node type links to a set of targets (relation + weight); NOTA additionally
// links to accepted AI suggestions and, optionally, a source TEXTO_BRUTO (GERA).
// No React, no HTTP — extracted from the create-node modal (was duplicated 6×).

export interface PendingEdge {
  sourceNodeId?: string;
  targetNodeId: string;
  tipoRelacao: string;
  peso: number;
}

interface WeightedLink {
  relacao: string;
  peso: number;
}
export interface AcceptedSuggestion {
  nodeId: string;
  relacao: string;
}

export interface CreatedNodeEdgesInput {
  type: string;
  newNodeId: string;
  topicoAssuntos: Array<WeightedLink & { assuntoId: string }>;
  conceitoTopicos: Array<WeightedLink & { topicoId: string }>;
  flashcardConceitos: Array<WeightedLink & { conceitoId: string }>;
  notaConceitos: Array<WeightedLink & { conceitoId: string }>;
  acceptedSuggestions: AcceptedSuggestion[];
  notaTextoBrutoId: string;
}

/** Clamp a user-entered edge weight to (0, 2]; anything invalid falls back to 1. */
export function clampEdgePeso(peso: number): number {
  return Number.isFinite(peso) && peso > 0 ? Math.min(2, peso) : 1;
}

function targetEdges<T extends WeightedLink>(links: T[], targetIdOf: (link: T) => string): PendingEdge[] {
  return links
    .filter((link) => targetIdOf(link))
    .map((link) => ({ targetNodeId: targetIdOf(link), tipoRelacao: link.relacao, peso: clampEdgePeso(link.peso) }));
}

function notaEdges(input: CreatedNodeEdgesInput): PendingEdge[] {
  const edges = targetEdges(input.notaConceitos, (l) => l.conceitoId);
  for (const s of input.acceptedSuggestions) {
    edges.push({ targetNodeId: s.nodeId, tipoRelacao: s.relacao, peso: 1.0 });
  }
  // TEXTO_BRUTO origin (at most one): the GERA edge goes FROM the text TO the note.
  if (input.notaTextoBrutoId) {
    edges.push({ sourceNodeId: input.notaTextoBrutoId, targetNodeId: input.newNodeId, tipoRelacao: "GERA", peso: 1.0 });
  }
  return edges;
}

/** Edges to create after a new node, by node type (targets default to the new node as source). */
export function buildCreatedNodeEdges(input: CreatedNodeEdgesInput): PendingEdge[] {
  if (input.type === "TOPICO") return targetEdges(input.topicoAssuntos, (l) => l.assuntoId);
  if (input.type === "CONCEITO") return targetEdges(input.conceitoTopicos, (l) => l.topicoId);
  if (input.type === "FLASHCARD") return targetEdges(input.flashcardConceitos, (l) => l.conceitoId);
  if (input.type === "NOTA") return notaEdges(input);
  return [];
}
