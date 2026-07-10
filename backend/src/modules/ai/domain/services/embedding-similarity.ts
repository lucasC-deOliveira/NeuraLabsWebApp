// Groups nodes into candidate duplicate sets by cosine similarity of their
// embedding vectors. Only nodes of the SAME tipo are compared; pairs above the
// threshold are unioned (transitively) into clusters. Pure logic.
//
// `similarityClusters` also reports each cluster's weakest internal link (minSim),
// which the hybrid detector uses to split high-confidence clusters (auto-accept)
// from uncertain ones (send to the LLM). `similarityRawGroups` is the LLM-free
// path: it maps clusters straight to RawGroup[] for selectDuplicateGroups().

import type { RawGroup } from './duplicate-groups';

export interface SimilarityItem {
  tipo: string;
  vetor: number[];
}

export interface SimilarityCluster {
  indices: number[];
  minSim: number; // weakest pairwise similarity in the cluster (its weakest link)
}

// 0.86 keeps recall high while avoiding sibling concepts ("Pilha" vs "Fila").
// The human still reviews every group before merging, so this errs toward recall.
export const DEFAULT_SIMILARITY_THRESHOLD = 0.86;

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Clusters same-type nodes whose vectors are within `threshold`, reporting each
 * cluster's weakest internal similarity.
 * @example similarityClusters([{tipo:'CONCEITO', vetor:[...]}], 0.8)
 */
export function similarityClusters(
  items: SimilarityItem[],
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD,
): SimilarityCluster[] {
  const parent = items.map((_, i) => i);
  for (let i = 0; i < items.length; i++) unionSimilar(items, i, threshold, parent);
  const byRoot = new Map<number, number[]>();
  for (let i = 0; i < items.length; i++) pushToRoot(byRoot, find(parent, i), i);
  return clustersFromRoots(items, byRoot);
}

/**
 * Candidate duplicate groups (2+ same-type nodes) straight from vectors, no LLM.
 * @example similarityRawGroups([{tipo:'CONCEITO', vetor:[...]}], 0.86)
 */
export function similarityRawGroups(
  items: SimilarityItem[],
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD,
): RawGroup[] {
  return similarityClusters(items, threshold).map((c) => ({
    indices: c.indices,
    sugestao: buildSugestao(items, c.indices),
  }));
}

function unionSimilar(
  items: SimilarityItem[],
  i: number,
  threshold: number,
  parent: number[],
): void {
  for (let j = i + 1; j < items.length; j++) {
    if (items[i].tipo !== items[j].tipo) continue;
    if (cosineSimilarity(items[i].vetor, items[j].vetor) >= threshold) union(parent, i, j);
  }
}

function find(parent: number[], x: number): number {
  let root = x;
  while (parent[root] !== root) root = parent[root];
  return root;
}

function union(parent: number[], a: number, b: number): void {
  parent[find(parent, a)] = find(parent, b);
}

function pushToRoot(byRoot: Map<number, number[]>, root: number, i: number): void {
  const arr = byRoot.get(root);
  if (arr) arr.push(i);
  else byRoot.set(root, [i]);
}

function clustersFromRoots(
  items: SimilarityItem[],
  byRoot: Map<number, number[]>,
): SimilarityCluster[] {
  const clusters: SimilarityCluster[] = [];
  for (const indices of byRoot.values()) {
    if (indices.length >= 2) clusters.push({ indices, minSim: minSimilarity(items, indices) });
  }
  return clusters;
}

function buildSugestao(items: SimilarityItem[], indices: number[]): string {
  const pct = Math.round(peakSimilarity(items, indices) * 100);
  return `Possível duplicata semântica (similaridade ~${pct}%). Sugestão: manter [${indices[0]}].`;
}

function peakSimilarity(items: SimilarityItem[], indices: number[]): number {
  let peak = 0;
  for (let a = 0; a < indices.length; a++) peak = Math.max(peak, rowPeak(items, indices, a));
  return peak;
}

function rowPeak(items: SimilarityItem[], indices: number[], a: number): number {
  let peak = 0;
  for (let b = a + 1; b < indices.length; b++) {
    peak = Math.max(peak, cosineSimilarity(items[indices[a]].vetor, items[indices[b]].vetor));
  }
  return peak;
}

function minSimilarity(items: SimilarityItem[], indices: number[]): number {
  let min = 1;
  for (let a = 0; a < indices.length; a++) min = Math.min(min, rowMin(items, indices, a));
  return min;
}

function rowMin(items: SimilarityItem[], indices: number[], a: number): number {
  let min = 1;
  for (let b = a + 1; b < indices.length; b++) {
    min = Math.min(min, cosineSimilarity(items[indices[a]].vetor, items[indices[b]].vetor));
  }
  return min;
}
