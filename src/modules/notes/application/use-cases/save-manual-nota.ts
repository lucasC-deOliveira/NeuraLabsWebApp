// Orchestrates the manual-note save: create staged assuntos → topicos →
// concepts, then the note itself. Depends only on ports (testable with fakes).
import type { ContentPort } from "../ports/content.port";
import type { NotesPort } from "../ports/notes.port";
import type { ConceitoArvore } from "../../domain/concept-tree.types";
import type {
  NotaConceitoRel,
  ConceitoConceitoRel,
  PendingAssunto,
  PendingTopic,
  PendingConcept,
} from "../../domain/manual-nota-draft";
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

async function createAssuntos(content: ContentPort, pending: PendingAssunto[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const pa of pending) {
    const created = await content.createAssunto(pa.nome);
    map.set(pa.tempId, created.id);
  }
  return map;
}

/** Pending topics actually referenced by the staged concepts, deduped. */
function referencedPendingTopics(concepts: PendingConcept[], topics: PendingTopic[]): Map<string, PendingTopic> {
  const byId = new Map<string, PendingTopic>();
  const refs = concepts.flatMap((pc) => pc.relsToPendingTopics);
  for (const rel of refs) {
    if (byId.has(rel.tempTopicoId)) continue;
    const pt = topics.find((t) => t.tempId === rel.tempTopicoId);
    if (pt) byId.set(rel.tempTopicoId, pt);
  }
  return byId;
}

async function createTopicos(
  content: ContentPort,
  pendingTopics: Map<string, PendingTopic>,
  assuntoIdMap: Map<string, string>,
): Promise<Map<string, string>> {
  const topicIdMap = new Map<string, string>();
  for (const [tempId, pt] of pendingTopics) {
    if (pt.relsToAssuntos.length === 0) continue;
    const target = pt.relsToAssuntos[0].targetAssuntoId;
    const realAid = assuntoIdMap.get(target) ?? target;
    const created = await content.createTopico(pt.nome, realAid);
    topicIdMap.set(tempId, created.id);
  }
  return topicIdMap;
}

function assuntoHasTopico(a: ConceitoArvore, topicoId: string): boolean {
  return a.relAssuntoTopico.some((rel) => rel.topicos.some((tp) => tp.id === topicoId));
}

function findAssuntoIdInTree(tree: ConceitoArvore[], topicoId: string): string {
  return tree.find((a) => assuntoHasTopico(a, topicoId))?.id ?? "";
}

function assuntoIdFromPendingTopic(
  topicoId: string,
  pendingTopics: Map<string, PendingTopic>,
  topicIdMap: Map<string, string>,
  assuntoIdMap: Map<string, string>,
): string {
  for (const pt of pendingTopics.values()) {
    if (topicIdMap.get(pt.tempId) === topicoId && pt.relsToAssuntos.length > 0) {
      const target = pt.relsToAssuntos[0].targetAssuntoId;
      return assuntoIdMap.get(target) ?? target;
    }
  }
  return "";
}

interface ConceptPlacement {
  topicoId: string;
  assuntoId: string;
}

function placeConcept(
  pc: PendingConcept,
  ctx: { tree: ConceitoArvore[]; topicIdMap: Map<string, string>; pendingTopics: Map<string, PendingTopic>; assuntoIdMap: Map<string, string> },
): ConceptPlacement | null {
  const topicoId = pc.relsToTopics.length > 0
    ? pc.relsToTopics[0].targetTopicoId
    : ctx.topicIdMap.get(pc.relsToPendingTopics[0]?.tempTopicoId);
  if (!topicoId) return null;

  let assuntoId = findAssuntoIdInTree(ctx.tree, topicoId);
  if (!assuntoId) assuntoId = assuntoIdFromPendingTopic(topicoId, ctx.pendingTopics, ctx.topicIdMap, ctx.assuntoIdMap);
  if (!assuntoId && ctx.tree.length > 0) assuntoId = ctx.tree[0].id;
  return { topicoId, assuntoId };
}

async function createConcepts(
  content: ContentPort,
  concepts: PendingConcept[],
  ctx: { tree: ConceitoArvore[]; topicIdMap: Map<string, string>; pendingTopics: Map<string, PendingTopic>; assuntoIdMap: Map<string, string> },
): Promise<string[]> {
  const createdIds: string[] = [];
  for (const pc of concepts) {
    const placement = placeConcept(pc, ctx);
    if (!placement) continue;
    const created = await content.createFullConcept({ nome: pc.nome, assuntoId: placement.assuntoId, topicoId: placement.topicoId });
    createdIds.push(created.id);
  }
  return createdIds;
}

/**
 * Creates all staged entities and the note. Returns the new note id.
 *
 * @example await saveManualNota({ content, notes }, draft); // → { notaId }
 */
export async function saveManualNota(ports: ManualNotaPorts, draft: ManualNotaDraft): Promise<{ notaId: string }> {
  const assuntoIdMap = await createAssuntos(ports.content, draft.pendingAssuntos);
  const pendingTopics = referencedPendingTopics(draft.pendingConcepts, draft.pendingTopics);
  const topicIdMap = await createTopicos(ports.content, pendingTopics, assuntoIdMap);
  const createdConceptIds = await createConcepts(ports.content, draft.pendingConcepts, {
    tree: draft.tree, topicIdMap, pendingTopics, assuntoIdMap,
  });

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
