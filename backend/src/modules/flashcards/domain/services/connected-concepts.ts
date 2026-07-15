import type { ConceptTag } from '../flashcard-views';

// Lógica pura para derivar, a partir das arestas do grafo, os conceitos conectados a
// cada flashcard. As consultas ao banco (nós, arestas, conceitos) vivem no adapter
// Prisma; aqui só combinamos os mapas resultantes — testável sem DB.

// Um ponto de aresta pode ser nulo (arestas ligadas a notas usam outros campos).
export interface EdgeEnds {
  nodeOrigemId: string | null;
  nodeDestinoId: string | null;
}

// Par (nó FLASHCARD, nó do outro lado) de uma aresta incidente ao flashcard.
export interface FlashcardEdgePair {
  fcNode: string;
  other: string;
}

/**
 * Para cada aresta incidente a um nó FLASHCARD, extrai o "outro" ponto (candidato a
 * conceito). Ignora arestas sem os dois lados ou cujo flashcard não está no conjunto.
 * @example flashcardEdgePairs(edges, new Set(["fcNodeA"]))
 */
export function flashcardEdgePairs(
  edges: EdgeEnds[],
  flashcardNodeIds: Set<string>,
): FlashcardEdgePair[] {
  const pairs: FlashcardEdgePair[] = [];
  for (const e of edges) {
    const pair = edgePair(e, flashcardNodeIds);
    if (pair) pairs.push(pair);
  }
  return pairs;
}

function edgePair(e: EdgeEnds, fcNodes: Set<string>): FlashcardEdgePair | null {
  const o = e.nodeOrigemId;
  const d = e.nodeDestinoId;
  if (!o || !d) return null;
  if (fcNodes.has(o)) return { fcNode: o, other: d };
  if (fcNodes.has(d)) return { fcNode: d, other: o };
  return null;
}

/**
 * Monta, por flashcard, as tags dos conceitos conectados (distintos e ordenados por
 * nome), resolvendo cada par → conceito → tag com pais.
 */
export function conceptTagsByFlashcard(
  pairs: FlashcardEdgePair[],
  nodeToFlashcard: Map<string, string>, // fcNode -> flashcardId
  conceptNodeToId: Map<string, string>, // otherNode -> conceitoId
  tagByConcept: Map<string, ConceptTag>, // conceitoId -> tag
): Map<string, ConceptTag[]> {
  const idsByFlashcard = collectConceptIds(pairs, nodeToFlashcard, conceptNodeToId);
  return resolveTags(idsByFlashcard, tagByConcept);
}

function collectConceptIds(
  pairs: FlashcardEdgePair[],
  nodeToFlashcard: Map<string, string>,
  conceptNodeToId: Map<string, string>,
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const { fcNode, other } of pairs) {
    const flashcardId = nodeToFlashcard.get(fcNode);
    const conceitoId = conceptNodeToId.get(other);
    if (!flashcardId || !conceitoId) continue;
    const set = out.get(flashcardId) ?? new Set<string>();
    set.add(conceitoId);
    out.set(flashcardId, set);
  }
  return out;
}

function resolveTags(
  idsByFlashcard: Map<string, Set<string>>,
  tagByConcept: Map<string, ConceptTag>,
): Map<string, ConceptTag[]> {
  const out = new Map<string, ConceptTag[]>();
  for (const [flashcardId, ids] of idsByFlashcard) {
    const tags = [...ids]
      .map((id) => tagByConcept.get(id))
      .filter((t): t is ConceptTag => t !== undefined);
    tags.sort((a, b) => a.conceito.localeCompare(b.conceito));
    out.set(flashcardId, tags);
  }
  return out;
}
