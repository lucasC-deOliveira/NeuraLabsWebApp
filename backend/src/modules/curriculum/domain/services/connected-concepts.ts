import type { ConceptTag } from '../curriculum-views';

// Lógica pura para derivar, a partir das arestas do grafo, os conceitos conectados a
// um "dono" — um flashcard ou uma questão. As consultas ao banco (nós, arestas,
// conceitos) vivem no adapter Prisma; aqui só combinamos os mapas — testável sem DB.

// Um ponto de aresta pode ser nulo (arestas ligadas a notas usam outros campos).
export interface EdgeEnds {
  nodeOrigemId: string | null;
  nodeDestinoId: string | null;
}

// Par (nó do dono, nó do outro lado) de uma aresta incidente ao dono.
export interface NodeEdgePair {
  ownerNode: string;
  other: string;
}

/**
 * Para cada aresta incidente a um nó dono, extrai o "outro" ponto (candidato a
 * conceito). Ignora arestas sem os dois lados ou cujo dono não está no conjunto.
 * @example nodeEdgePairs(edges, new Set(["ownerNodeA"]))
 */
export function nodeEdgePairs(edges: EdgeEnds[], ownerNodeIds: Set<string>): NodeEdgePair[] {
  const pairs: NodeEdgePair[] = [];
  for (const e of edges) {
    const pair = edgePair(e, ownerNodeIds);
    if (pair) pairs.push(pair);
  }
  return pairs;
}

function edgePair(e: EdgeEnds, ownerNodes: Set<string>): NodeEdgePair | null {
  const o = e.nodeOrigemId;
  const d = e.nodeDestinoId;
  if (!o || !d) return null;
  if (ownerNodes.has(o)) return { ownerNode: o, other: d };
  if (ownerNodes.has(d)) return { ownerNode: d, other: o };
  return null;
}

/**
 * Monta, por flashcard, as tags dos conceitos conectados (distintos e ordenados por
 * nome), resolvendo cada par → conceito → tag com pais.
 */
export function conceptTagsByOwner(
  pairs: NodeEdgePair[],
  nodeToOwner: Map<string, string>, // ownerNode -> flashcardId
  conceptNodeToId: Map<string, string>, // otherNode -> conceitoId
  tagByConcept: Map<string, ConceptTag>, // conceitoId -> tag
): Map<string, ConceptTag[]> {
  const idsByOwner = collectConceptIds(pairs, nodeToOwner, conceptNodeToId);
  return resolveTags(idsByOwner, tagByConcept);
}

function collectConceptIds(
  pairs: NodeEdgePair[],
  nodeToOwner: Map<string, string>,
  conceptNodeToId: Map<string, string>,
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const { ownerNode, other } of pairs) {
    const flashcardId = nodeToOwner.get(ownerNode);
    const conceitoId = conceptNodeToId.get(other);
    if (!flashcardId || !conceitoId) continue;
    const set = out.get(flashcardId) ?? new Set<string>();
    set.add(conceitoId);
    out.set(flashcardId, set);
  }
  return out;
}

function resolveTags(
  idsByOwner: Map<string, Set<string>>,
  tagByConcept: Map<string, ConceptTag>,
): Map<string, ConceptTag[]> {
  const out = new Map<string, ConceptTag[]>();
  for (const [flashcardId, ids] of idsByOwner) {
    const tags = [...ids]
      .map((id) => tagByConcept.get(id))
      .filter((t): t is ConceptTag => t !== undefined);
    tags.sort((a, b) => a.conceito.localeCompare(b.conceito));
    out.set(flashcardId, tags);
  }
  return out;
}
