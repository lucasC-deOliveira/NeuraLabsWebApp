// Persists staged assuntos → topicos → concepts against the hierarchy, in order.
// Returns a map from each pending concept's temp id to its created real id, so
// callers (notes, flashcards) can resolve their staged references. Ports only.
import type { ContentPort } from "../ports/content.port";
import type { ConceitoArvore } from "../../domain/concept-tree.types";
import type { PendingAssunto, PendingTopic, PendingConcept } from "../../domain/concept-draft";

export interface StagedConcepts {
  tree: ConceitoArvore[];
  pendingAssuntos: PendingAssunto[];
  pendingTopics: PendingTopic[];
  pendingConcepts: PendingConcept[];
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

interface PlacementCtx {
  tree: ConceitoArvore[];
  topicIdMap: Map<string, string>;
  pendingTopics: Map<string, PendingTopic>;
  assuntoIdMap: Map<string, string>;
}

function placeConcept(pc: PendingConcept, ctx: PlacementCtx): { topicoId: string; assuntoId: string } | null {
  const topicoId = pc.relsToTopics.length > 0
    ? pc.relsToTopics[0].targetTopicoId
    : ctx.topicIdMap.get(pc.relsToPendingTopics[0]?.tempTopicoId);
  if (!topicoId) return null;

  let assuntoId = findAssuntoIdInTree(ctx.tree, topicoId);
  if (!assuntoId) assuntoId = assuntoIdFromPendingTopic(topicoId, ctx.pendingTopics, ctx.topicIdMap, ctx.assuntoIdMap);
  if (!assuntoId && ctx.tree.length > 0) assuntoId = ctx.tree[0].id;
  return { topicoId, assuntoId };
}

async function createConcepts(content: ContentPort, concepts: PendingConcept[], ctx: PlacementCtx): Promise<Map<string, string>> {
  const byTempId = new Map<string, string>();
  for (const pc of concepts) {
    const placement = placeConcept(pc, ctx);
    if (!placement) continue;
    const created = await content.createFullConcept({ nome: pc.nome, assuntoId: placement.assuntoId, topicoId: placement.topicoId });
    byTempId.set(pc.tempId, created.id);
  }
  return byTempId;
}

/**
 * Creates all staged assuntos/topicos/concepts. Returns pendingConcept.tempId →
 * created concept id.
 *
 * @example const ids = await persistStagedConcepts(content, staged); // Map
 */
export async function persistStagedConcepts(content: ContentPort, staged: StagedConcepts): Promise<Map<string, string>> {
  const assuntoIdMap = await createAssuntos(content, staged.pendingAssuntos);
  const pendingTopics = referencedPendingTopics(staged.pendingConcepts, staged.pendingTopics);
  const topicIdMap = await createTopicos(content, pendingTopics, assuntoIdMap);
  return createConcepts(content, staged.pendingConcepts, { tree: staged.tree, topicIdMap, pendingTopics, assuntoIdMap });
}
