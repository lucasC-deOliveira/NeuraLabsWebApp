// Pure derivations over the current graph layout — extracted from the graph page so
// they can be unit-tested. No React, no HTTP. Node/edge shapes are minimal structural
// types (SimNode/GraphEdgeType are structurally compatible).

export interface GraphNodeLike {
  id: string;
  label: string;
  group: string;
}

export interface GraphEdgeLike {
  source: string;
  target: string;
}

interface EntityItem {
  id: string;
  nome: string;
}

export interface GraphEntities {
  assuntos: EntityItem[];
  topicos: EntityItem[];
  conceitos: EntityItem[];
  textosBrutos: EntityItem[];
  flashcards: EntityItem[];
}

const ENTITY_BUCKET: Record<string, keyof GraphEntities> = {
  ASSUNTO: "assuntos",
  TOPICO: "topicos",
  CONCEITO: "conceitos",
  TEXTO_BRUTO: "textosBrutos",
  FLASHCARD: "flashcards",
};

function addEntity(result: GraphEntities, n: GraphNodeLike): void {
  const bucket = ENTITY_BUCKET[n.group];
  if (bucket) result[bucket].push({ id: n.id, nome: n.label });
}

/** Buckets ASSUNTO/TOPICO/CONCEITO/TEXTO_BRUTO/FLASHCARD nodes for the create-node pickers. */
export function splitGraphEntities(nodes: GraphNodeLike[]): GraphEntities {
  const result: GraphEntities = { assuntos: [], topicos: [], conceitos: [], textosBrutos: [], flashcards: [] };
  for (const n of nodes) addEntity(result, n);
  return result;
}

/** Counts nodes per group (layers/filter panel). */
export function countNodesByType(nodes: GraphNodeLike[]): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const n of nodes) stats[n.group] = (stats[n.group] ?? 0) + 1;
  return stats;
}

function pushAdj(adj: Map<string, string[]>, from: string, to: string): void {
  const list = adj.get(from) ?? [];
  list.push(to);
  adj.set(from, list);
}

function buildAdjacency(edges: GraphEdgeLike[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    pushAdj(adj, e.source, e.target);
    pushAdj(adj, e.target, e.source);
  }
  return adj;
}

function visitNeighbors(adj: Map<string, string[]>, cur: string, d: number, dist: Map<string, number>, queue: string[]): void {
  for (const nb of adj.get(cur) ?? []) {
    if (dist.has(nb)) continue;
    dist.set(nb, d + 1);
    queue.push(nb);
  }
}

function bfsDistances(adj: Map<string, string[]>, start: string, maxDepth: number): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]]);
  const queue: string[] = [start];
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const d = dist.get(cur) ?? 0;
    if (d < maxDepth) visitNeighbors(adj, cur, d, dist, queue);
  }
  return dist;
}

/**
 * BFS from a node up to `depth` hops, returning the ids of FLASHCARD nodes reached.
 * @example neighborhoodFlashcardIds("c1", 2, nodes, edges)
 */
export function neighborhoodFlashcardIds(
  nodeId: string,
  depth: number,
  nodes: GraphNodeLike[],
  edges: GraphEdgeLike[],
): string[] {
  const dist = bfsDistances(buildAdjacency(edges), nodeId, depth);
  const groupById = new Map(nodes.map((n) => [n.id, n.group]));
  return [...dist.keys()].filter((id) => groupById.get(id) === "FLASHCARD");
}
