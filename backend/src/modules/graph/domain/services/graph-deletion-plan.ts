// Pure planning for graph deletion: which member entities to delete, in what
// order, and which concepts must have their flashcards detached first. The
// "shared with another graph" check is I/O and lives behind a port.

export interface GraphMember {
  tipoNode: string;
  referenciaId: string;
}

// Reusable entity types the user may opt to keep when deleting a graph.
export const KEEPABLE_TYPES: ReadonlySet<string> = new Set([
  'FLASHCARD',
  'BARALHO',
  'QUESTION',
  'NOTA',
  'PROVA',
  'TEXTO_BRUTO',
]);

// Only reusable types can be kept; structural/unknown types are ignored.
export function keptTypes(keepTypes: readonly string[]): Set<string> {
  return new Set(keepTypes.filter((t) => KEEPABLE_TYPES.has(t)));
}

// Entities eligible for deletion: structural types (ASSUNTO/TOPICO/CONCEITO)
// always; reusable types only when not kept; GRAFO_REF never deletes the
// referenced graph (it is another graph).
export function selectDeletionCandidates(
  members: readonly GraphMember[],
  keepTypes: readonly string[],
): GraphMember[] {
  const keep = keptTypes(keepTypes);
  return members.filter(
    (m) => m.tipoNode !== 'GRAFO_REF' && !(KEEPABLE_TYPES.has(m.tipoNode) && keep.has(m.tipoNode)),
  );
}

// Deletion order: flashcards before concepts (Flashcard.conceito is onDelete
// Cascade), then concepts, topics, subjects; everything else in the middle.
export function sortForDeletion(members: readonly GraphMember[]): GraphMember[] {
  return [...members].sort((a, b) => deletionRank(a.tipoNode) - deletionRank(b.tipoNode));
}

function deletionRank(tipo: string): number {
  const ranks: Record<string, number> = { FLASHCARD: 0, CONCEITO: 2, TOPICO: 3, ASSUNTO: 4 };
  return ranks[tipo] ?? 1;
}

// When flashcards are kept, the concept ids being deleted whose flashcards must
// be detached first so the Conceito→Flashcard cascade does not remove them.
export function conceptIdsToDetach(
  toDelete: readonly GraphMember[],
  keepTypes: readonly string[],
): string[] {
  if (!keptTypes(keepTypes).has('FLASHCARD')) return [];
  return toDelete.filter((m) => m.tipoNode === 'CONCEITO').map((m) => m.referenciaId);
}
