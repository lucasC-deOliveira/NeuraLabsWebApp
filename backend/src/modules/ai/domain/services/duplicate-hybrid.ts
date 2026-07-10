// Pure logic for the hybrid duplicate detector (embeddings recall → LLM precision):
//  • split candidate clusters into high-confidence (auto-accept, no LLM) vs
//    uncertain (send to the LLM);
//  • a per-cluster signature (membership + normalized names) drives the incremental
//    cache — it changes only when a node joins/leaves or is renamed;
//  • attribute the LLM's confirmed groups back to their source cluster, and
//    assemble the final DuplicateGroup[] for the UI.

import { normalizeNodeName } from './node-name-key';
import { MAX_DUPLICATE_GROUPS, type DuplicateGroup, type DuplicateNode } from './duplicate-groups';
import type { SimilarityCluster } from './embedding-similarity';
import type { ClusterVerdict, VerdictMap } from '../ports/duplicate-verdict-repository';

// Candidate recall: permissive on purpose (the LLM/human filters false positives).
export const RECALL_THRESHOLD = 0.8;
// Weakest-link similarity above which a cluster is confidently a duplicate (no LLM).
export const HIGH_CONFIDENCE = 0.95;

export interface PartitionedClusters {
  autoAccept: SimilarityCluster[];
  uncertain: SimilarityCluster[];
}

export function partitionByConfidence(
  clusters: SimilarityCluster[],
  high: number = HIGH_CONFIDENCE,
): PartitionedClusters {
  const autoAccept: SimilarityCluster[] = [];
  const uncertain: SimilarityCluster[] = [];
  for (const c of clusters) (c.minSim >= high ? autoAccept : uncertain).push(c);
  return { autoAccept, uncertain };
}

export function clusterSignature(cluster: SimilarityCluster, nodes: DuplicateNode[]): string {
  return cluster.indices
    .map((i) => `${nodes[i].id}:${normalizeNodeName(nodes[i].nome)}`)
    .sort()
    .join('|');
}

// Deduplicated node list covering every given cluster — the LLM shortlist.
// Generic so it preserves the caller's richer node type (e.g. with descriptions).
export function shortlistNodes<T extends DuplicateNode>(
  clusters: SimilarityCluster[],
  nodes: T[],
): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const c of clusters) collectUnique(c, nodes, seen, out);
  return out;
}

function collectUnique<T>(
  cluster: SimilarityCluster,
  nodes: T[],
  seen: Set<number>,
  out: T[],
): void {
  for (const i of cluster.indices) {
    if (seen.has(i)) continue;
    seen.add(i);
    out.push(nodes[i]);
  }
}

/**
 * Attributes the LLM's confirmed groups back to the signature of the candidate
 * cluster they came from (candidate clusters are disjoint, so a group's first node
 * identifies its cluster). Every judged signature gets an entry — an empty list
 * caches the negative verdict so it is not re-asked.
 */
export function attributeGroups(
  groups: DuplicateGroup[],
  idToSignature: Map<string, string>,
  judgedSignatures: string[],
): VerdictMap {
  const out: VerdictMap = {};
  for (const sig of judgedSignatures) out[sig] = [];
  for (const g of groups) pushVerdict(g, idToSignature, out);
  return out;
}

function pushVerdict(
  group: DuplicateGroup,
  idToSignature: Map<string, string>,
  out: VerdictMap,
): void {
  const sig = idToSignature.get(group.nodes[0]?.id ?? '');
  if (sig) out[sig].push({ refIds: group.nodes.map((n) => n.id), sugestao: group.sugestao });
}

export function autoAcceptGroup(
  cluster: SimilarityCluster,
  nodes: DuplicateNode[],
): DuplicateGroup {
  const pct = Math.round(cluster.minSim * 100);
  const first = nodes[cluster.indices[0]];
  return {
    nodes: cluster.indices.map((i) => pick(nodes[i])),
    sugestao: `Alta similaridade (~${pct}%). Sugestão: manter "${first.nome}".`,
  };
}

/**
 * Builds the final UI groups: high-confidence clusters directly, plus each
 * uncertain cluster's cached/fresh LLM verdicts. Capped like the LLM detector.
 */
export function assembleGroups(
  partition: PartitionedClusters,
  verdicts: VerdictMap,
  nodes: DuplicateNode[],
): DuplicateGroup[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const groups = partition.autoAccept.map((c) => autoAcceptGroup(c, nodes));
  for (const c of partition.uncertain) appendVerdicts(c, nodes, verdicts, byId, groups);
  return groups.slice(0, MAX_DUPLICATE_GROUPS);
}

function appendVerdicts(
  cluster: SimilarityCluster,
  nodes: DuplicateNode[],
  verdicts: VerdictMap,
  byId: Map<string, DuplicateNode>,
  groups: DuplicateGroup[],
): void {
  for (const v of verdicts[clusterSignature(cluster, nodes)] ?? []) {
    const g = verdictToGroup(v, byId);
    if (g) groups.push(g);
  }
}

function verdictToGroup(
  verdict: ClusterVerdict,
  byId: Map<string, DuplicateNode>,
): DuplicateGroup | null {
  const nodes = verdict.refIds
    .map((id) => byId.get(id))
    .filter((n): n is DuplicateNode => !!n)
    .map(pick);
  return nodes.length >= 2 ? { nodes, sugestao: verdict.sugestao } : null;
}

function pick(n: DuplicateNode): DuplicateNode {
  return { id: n.id, nome: n.nome, tipo: n.tipo };
}
