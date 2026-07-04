// Orchestrates the manual-note save: create the staged concept graph (shared
// content use-case), then the note itself. Depends only on ports.
import {
  persistStagedConcepts,
  type ContentPort,
  type ConceitoArvore,
  type PendingAssunto,
  type PendingTopic,
  type PendingConcept,
} from "@/modules/content";
import type { NotesPort } from "../ports/notes.port";
import type { NotaConceitoRel, ConceitoConceitoRel } from "../../domain/manual-nota-draft";
import type { SubtipoNota } from "../../domain/nota.types";

export interface ManualNotaDraft {
  titulo: string;
  conteudo: string;
  subtipo: SubtipoNota | null;
  tree: ConceitoArvore[];
  selectedConceitoIds: string[];
  notaConceitoRels: NotaConceitoRel[];
  conceitoConceitoRels: ConceitoConceitoRel[];
  pendingAssuntos: PendingAssunto[];
  pendingTopics: PendingTopic[];
  pendingConcepts: PendingConcept[];
}

export interface ManualNotaPorts {
  content: ContentPort;
  notes: NotesPort;
}

/**
 * Creates all staged concepts and the note. Returns the new note id.
 *
 * @example await saveManualNota({ content, notes }, draft); // → { notaId }
 */
export async function saveManualNota(ports: ManualNotaPorts, draft: ManualNotaDraft): Promise<{ notaId: string }> {
  const createdByTempId = await persistStagedConcepts(ports.content, {
    tree: draft.tree,
    pendingAssuntos: draft.pendingAssuntos,
    pendingTopics: draft.pendingTopics,
    pendingConcepts: draft.pendingConcepts,
  });
  const createdConceptIds = Array.from(createdByTempId.values());

  const allIds = new Set([...draft.selectedConceitoIds, ...createdConceptIds]);
  const extraRels: NotaConceitoRel[] = createdConceptIds.map((id) => ({ conceitoId: id, tipoRelacao: "DEFINE" }));
  return ports.notes.createNotaManual({
    titulo: draft.titulo.trim(),
    conteudo: draft.conteudo.trim(),
    subtipo: draft.subtipo,
    selectedConceitoIds: Array.from(allIds),
    notaConceitoRels: draft.notaConceitoRels.concat(extraRels),
    conceitoConceitoRels: draft.conceitoConceitoRels,
  });
}
