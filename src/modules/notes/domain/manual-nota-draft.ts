// Note-specific relation model + re-exports of the shared concept-draft model
// (staging types/builders live in the content module).
export type {
  StagedRelation, PendingConcept, PendingTopic, PendingAssunto, BuiltConcept,
} from "@/modules/content";
export { buildPendingConcept, collectNewTopics } from "@/modules/content";

export interface NotaConceitoRel {
  conceitoId: string;
  tipoRelacao: string;
}

export interface ConceitoConceitoRel {
  origemId: string;
  destinoId: string;
  tipoRelacao: string;
}

/**
 * Reconciles the note→concept relations when the concept selection changes:
 * keeps existing relations for still-selected concepts and adds new ones
 * (default relation "DEFINE") for newly selected ids.
 */
export function syncNotaConceitoRels(prev: NotaConceitoRel[], selectedIds: string[]): NotaConceitoRel[] {
  const selected = new Set(selectedIds);
  const existingIds = new Set(prev.map((r) => r.conceitoId));
  const kept = prev.filter((r) => selected.has(r.conceitoId));
  const added = selectedIds
    .filter((id) => !existingIds.has(id))
    .map((id) => ({ conceitoId: id, tipoRelacao: "DEFINE" }));
  return [...kept, ...added];
}
