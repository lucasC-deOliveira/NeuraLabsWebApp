// Use-case: add existing entities (flashcards/notas) to the graph, then wire the
// chosen relation edges (same relations as the create-flow). Pure application
// logic (no React). Individual edge failures are tolerated. Extracted from the
// "add existing items" tab of the create-node modal.
import { clampEdgePeso } from "../../domain/services/node-creation-edges";
import type { NodeCreationPort } from "./create-graph-node";

interface WeightedConceitoLink {
  conceitoId: string;
  relacao: string;
  peso: number;
}

export interface AddExistingItemsInput {
  grafoId: string;
  type: string;
  itemIds: string[];
  flashcards: Array<{ id: string; conceitoId?: string | null }>;
  notas: Array<{ id: string }>;
  flashcardConceitos: WeightedConceitoLink[];
  notaConceitos: WeightedConceitoLink[];
  notaTextoBrutoId: string;
}

function resolveItem(input: AddExistingItemsInput, itemId: string): { tipoNode: string; data: Record<string, unknown> } | null {
  const flashcard = input.flashcards.find((f) => f.id === itemId);
  if (flashcard) return { tipoNode: "FLASHCARD", data: { entityId: itemId, conceitoId: flashcard.conceitoId } };
  if (input.notas.some((n) => n.id === itemId)) return { tipoNode: "NOTA", data: { entityId: itemId } };
  return null;
}

async function addItems(port: NodeCreationPort, input: AddExistingItemsInput): Promise<{ flashcardIds: string[]; notaIds: string[] }> {
  const flashcardIds: string[] = [];
  const notaIds: string[] = [];
  for (const itemId of input.itemIds) {
    const resolved = resolveItem(input, itemId);
    if (!resolved) continue;
    const { nodeId } = await port.addNodeToGraph(input.grafoId, resolved.tipoNode, resolved.data);
    (resolved.tipoNode === "FLASHCARD" ? flashcardIds : notaIds).push(nodeId ?? itemId);
  }
  return { flashcardIds, notaIds };
}

async function postEdge(
  port: NodeCreationPort,
  grafoId: string,
  sourceNodeId: string,
  targetNodeId: string,
  tipoRelacao: string,
  peso: number,
): Promise<boolean> {
  try {
    await port.createEdge(grafoId, { sourceNodeId, targetNodeId, tipoRelacao, peso });
    return true;
  } catch {
    return false;
  }
}

async function linkConceitos(port: NodeCreationPort, grafoId: string, sourceId: string, links: WeightedConceitoLink[]): Promise<number> {
  let created = 0;
  for (const link of links) {
    if (link.conceitoId && (await postEdge(port, grafoId, sourceId, link.conceitoId, link.relacao, clampEdgePeso(link.peso)))) created++;
  }
  return created;
}

async function linkFlashcards(port: NodeCreationPort, grafoId: string, fcIds: string[], links: WeightedConceitoLink[]): Promise<number> {
  let created = 0;
  for (const fcId of fcIds) created += await linkConceitos(port, grafoId, fcId, links);
  return created;
}

async function linkNotas(
  port: NodeCreationPort,
  grafoId: string,
  notaIds: string[],
  links: WeightedConceitoLink[],
  textoBrutoId: string,
): Promise<number> {
  let created = 0;
  for (const notaId of notaIds) {
    created += await linkConceitos(port, grafoId, notaId, links);
    if (textoBrutoId && (await postEdge(port, grafoId, textoBrutoId, notaId, "GERA", 1.0))) created++;
  }
  return created;
}

export async function addExistingItems(port: NodeCreationPort, input: AddExistingItemsInput): Promise<{ createdEdges: number }> {
  const { flashcardIds, notaIds } = await addItems(port, input);
  if (input.type === "FLASHCARD") {
    return { createdEdges: await linkFlashcards(port, input.grafoId, flashcardIds, input.flashcardConceitos) };
  }
  if (input.type === "NOTA") {
    return { createdEdges: await linkNotas(port, input.grafoId, notaIds, input.notaConceitos, input.notaTextoBrutoId) };
  }
  return { createdEdges: 0 };
}
