// Finds "bridges": pairs of semantically close concepts that live in DIFFERENT
// graphs and are not yet connected. Pure logic over embedding vectors.
//
// This only became expressible after the node-as-system migration (Fase 5): while
// the node carried `id_grafo`, a concept of graph A and one of graph B were
// different rows and no edge could join them.
//
// Deliberately NOT the duplicate detector: pairs above NEAR_DUPLICATE_SIMILARITY
// are the same idea written twice and belong to the merge flow, not here.

import { cosineSimilarity } from './embedding-similarity';

export interface BridgeItem {
  id: string;
  nome: string;
  grafoId: string;
  grafoNome: string;
  vetor: number[];
}

export interface BridgeCandidate {
  sourceId: string;
  targetId: string;
  sourceNome: string;
  targetNome: string;
  sourceGrafoNome: string;
  targetGrafoNome: string;
  similaridade: number;
}

// Lower than the dedup threshold (0.86) on purpose: a bridge is "related", not
// "the same". Every candidate is reviewed by a human before it is written.
export const DEFAULT_BRIDGE_THRESHOLD = 0.78;

// At or above this the two concepts are the same idea duplicated across graphs;
// suggesting an edge would cement the duplication instead of resolving it.
export const NEAR_DUPLICATE_SIMILARITY = 0.95;

export const MAX_BRIDGE_CANDIDATES = 20;

/** Order-independent key for "these two nodes are already connected". */
export function bridgePairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Best cross-graph pairs, strongest first, at most one per node on each side.
 * @example selectBridgeCandidates(inside, outside, existingPairs, 0.78, 20)
 */
export function selectBridgeCandidates(
  inside: BridgeItem[],
  outside: BridgeItem[],
  existingPairs: Set<string>,
  threshold: number = DEFAULT_BRIDGE_THRESHOLD,
  limit: number = MAX_BRIDGE_CANDIDATES,
): BridgeCandidate[] {
  const scored = allEligiblePairs(inside, outside, existingPairs, threshold);
  scored.sort((a, b) => b.similaridade - a.similaridade);
  return takeBestPerNode(scored, limit);
}

function allEligiblePairs(
  inside: BridgeItem[],
  outside: BridgeItem[],
  existingPairs: Set<string>,
  threshold: number,
): BridgeCandidate[] {
  const pairs: BridgeCandidate[] = [];
  for (const source of inside) {
    pairs.push(...pairsForSource(source, outside, existingPairs, threshold));
  }
  return pairs;
}

function pairsForSource(
  source: BridgeItem,
  outside: BridgeItem[],
  existingPairs: Set<string>,
  threshold: number,
): BridgeCandidate[] {
  const pairs: BridgeCandidate[] = [];
  for (const target of outside) {
    const sim = eligibleSimilarity(source, target, existingPairs, threshold);
    if (sim !== null) pairs.push(toCandidate(source, target, sim));
  }
  return pairs;
}

// Returns the similarity when the pair is a legitimate bridge, or null when it is
// same-graph, already linked, too weak, or a near-duplicate.
function eligibleSimilarity(
  source: BridgeItem,
  target: BridgeItem,
  existingPairs: Set<string>,
  threshold: number,
): number | null {
  if (source.grafoId === target.grafoId) return null;
  if (source.id === target.id) return null;
  if (existingPairs.has(bridgePairKey(source.id, target.id))) return null;
  const sim = cosineSimilarity(source.vetor, target.vetor);
  if (sim < threshold || sim >= NEAR_DUPLICATE_SIMILARITY) return null;
  return sim;
}

function toCandidate(
  source: BridgeItem,
  target: BridgeItem,
  similaridade: number,
): BridgeCandidate {
  return {
    sourceId: source.id,
    targetId: target.id,
    sourceNome: source.nome,
    targetNome: target.nome,
    sourceGrafoNome: source.grafoNome,
    targetGrafoNome: target.grafoNome,
    similaridade,
  };
}

// One suggestion per node keeps the review list readable: without it a hub concept
// ("Algoritmo") pairs with dozens of neighbours and crowds out every other bridge.
function takeBestPerNode(scored: BridgeCandidate[], limit: number): BridgeCandidate[] {
  const used = new Set<string>();
  const picked: BridgeCandidate[] = [];
  for (const candidate of scored) {
    if (picked.length >= limit) break;
    if (used.has(candidate.sourceId) || used.has(candidate.targetId)) continue;
    used.add(candidate.sourceId);
    used.add(candidate.targetId);
    picked.push(candidate);
  }
  return picked;
}
