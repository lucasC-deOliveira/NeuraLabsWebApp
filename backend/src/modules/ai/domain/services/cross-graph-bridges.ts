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

// The cut is RELATIVE, not absolute: only the top slice of the run's own
// similarity distribution survives.
//
// Measured on 400 real concepts with multilingual-e5-small: min 0.73, median
// 0.847, p99 0.905 — 98% of all pairs sat above the 0.78 absolute threshold this
// used to have, which made it meaningless. The compression is a property of the
// model, not of the data, so any fixed number is only ever calibrated for one
// provider. A percentile transfers across providers untouched.
export const DEFAULT_BRIDGE_PERCENTILE = 0.99;

// Only near-exact matches are the same concept duplicated. Deliberately NOT 0.95:
// in the measured space "Criptografia simétrica" ↔ "assimétrica" scores 0.966 and
// is one of the best bridges there is — a 0.95 ceiling threw away the good ones.
export const NEAR_DUPLICATE_SIMILARITY = 0.999;

export const MAX_BRIDGE_CANDIDATES = 20;

export interface BridgeSelection {
  // Fraction of the run's own pairs to keep, 0..1. Higher = stricter.
  percentile?: number;
  limit?: number;
}

/** Order-independent key for "these two nodes are already connected". */
export function bridgePairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Best cross-graph pairs, strongest first, at most one per node on each side.
 * @example selectBridgeCandidates(inside, outside, existingPairs, { percentile: 0.99 })
 */
export function selectBridgeCandidates(
  inside: BridgeItem[],
  outside: BridgeItem[],
  existingPairs: Set<string>,
  options: BridgeSelection = {},
): BridgeCandidate[] {
  const scored = allEligiblePairs(inside, outside, existingPairs);
  scored.sort((a, b) => b.similaridade - a.similaridade);
  const floor = percentileFloor(scored, options.percentile ?? DEFAULT_BRIDGE_PERCENTILE);
  const strong = scored.filter((c) => c.similaridade >= floor);
  return takeBestPerNode(strong, options.limit ?? MAX_BRIDGE_CANDIDATES);
}

// Similarity of the pair at the given percentile of THIS run. With too few pairs
// to have a distribution at all, every pair is kept and `limit` does the cutting.
function percentileFloor(scored: BridgeCandidate[], percentile: number): number {
  if (scored.length < MIN_PAIRS_FOR_PERCENTILE) return 0;
  const index = Math.floor(scored.length * (1 - percentile));
  return scored[Math.min(index, scored.length - 1)].similaridade;
}

const MIN_PAIRS_FOR_PERCENTILE = 20;

function allEligiblePairs(
  inside: BridgeItem[],
  outside: BridgeItem[],
  existingPairs: Set<string>,
): BridgeCandidate[] {
  const pairs: BridgeCandidate[] = [];
  for (const source of inside) {
    pairs.push(...pairsForSource(source, outside, existingPairs));
  }
  return pairs;
}

function pairsForSource(
  source: BridgeItem,
  outside: BridgeItem[],
  existingPairs: Set<string>,
): BridgeCandidate[] {
  const pairs: BridgeCandidate[] = [];
  for (const target of outside) {
    const sim = eligibleSimilarity(source, target, existingPairs);
    if (sim !== null) pairs.push(toCandidate(source, target, sim));
  }
  return pairs;
}

// Returns the similarity when the pair could be a bridge, or null when it is
// same-graph, already linked, or a duplicate. How STRONG a pair must be is
// decided later, from the distribution of all pairs.
function eligibleSimilarity(
  source: BridgeItem,
  target: BridgeItem,
  existingPairs: Set<string>,
): number | null {
  if (source.grafoId === target.grafoId) return null;
  if (source.id === target.id) return null;
  if (sameNameIgnoringPunctuation(source.nome, target.nome)) return null;
  if (existingPairs.has(bridgePairKey(source.id, target.id))) return null;
  const sim = cosineSimilarity(source.vetor, target.vetor);
  if (sim >= NEAR_DUPLICATE_SIMILARITY) return null;
  return sim;
}

// "Composição vs Herança" x "Composição vs. Herança" — mesmo conceito escrito duas
// vezes, que o cosseno pontua alto mas abaixo do teto de near-duplicate. Ligar os
// dois cimentaria a duplicação em vez de resolvê-la (é caso do fluxo de merge).
//
// Mais agressivo que o `nodeNameKey` do import, que preserva pontuação para não
// fundir "C++" com "C#": lá o merge é irreversível, aqui só se deixa de SUGERIR
// uma aresta — e um falso negativo custa menos que ruído garantido na revisão.
function sameNameIgnoringPunctuation(a: string, b: string): boolean {
  return stripForComparison(a) === stripForComparison(b);
}

function stripForComparison(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
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
