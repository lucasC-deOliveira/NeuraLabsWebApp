import type { DuplicateGroup } from '../../domain/services/duplicate-groups';
import {
  similarityClusters,
  type SimilarityCluster,
  type SimilarityItem,
} from '../../domain/services/embedding-similarity';
import {
  RECALL_THRESHOLD,
  assembleGroups,
  attributeGroups,
  clusterSignature,
  partitionByConfidence,
  shortlistNodes,
  type PartitionedClusters,
} from '../../domain/services/duplicate-hybrid';
import { ensureNodeVectors } from '../ensure-node-vectors';
import type {
  DuplicateGraphNode,
  DuplicateNodesRepository,
} from '../../domain/ports/duplicate-nodes-repository';
import type { EmbeddingPort } from '../../domain/ports/embedding-port';
import type { NodeEmbeddingRepository } from '../../domain/ports/node-embedding-repository';
import type {
  DuplicateVerdictRepository,
  VerdictMap,
} from '../../domain/ports/duplicate-verdict-repository';
import type { DetectDuplicatesUseCase } from './detect-duplicates.use-case';

/**
 * Hybrid duplicate detector: embeddings recall → LLM precision on the uncertain
 * shortlist only. High-confidence clusters are auto-accepted (0 token) and an
 * incremental cache lets unchanged clusters skip the LLM on re-runs — so the model
 * never sees the whole graph.
 * @example detectDuplicatesHybrid.execute('u1', 'g1')
 */
export class DetectDuplicatesHybridUseCase {
  constructor(
    private readonly nodes: DuplicateNodesRepository,
    private readonly embeddings: EmbeddingPort,
    private readonly store: NodeEmbeddingRepository,
    private readonly verdicts: DuplicateVerdictRepository,
    private readonly llm: DetectDuplicatesUseCase,
  ) {}

  async execute(userId: string, grafoId: string): Promise<{ groups: DuplicateGroup[] }> {
    const nodes = await this.nodes.loadGraphNodes(userId, grafoId);
    if (nodes.length < 2) return { groups: [] };
    const vectors = await ensureNodeVectors(this.embeddings, this.store, userId, nodes);
    const items: SimilarityItem[] = nodes.map((n, i) => ({ tipo: n.tipo, vetor: vectors[i] }));
    const partition = partitionByConfidence(similarityClusters(items, RECALL_THRESHOLD));
    const verdicts = await this.resolveVerdicts(userId, grafoId, partition, nodes);
    return { groups: assembleGroups(partition, verdicts, nodes) };
  }

  private async resolveVerdicts(
    userId: string,
    grafoId: string,
    partition: PartitionedClusters,
    nodes: DuplicateGraphNode[],
  ): Promise<VerdictMap> {
    const cache = await this.verdicts.load(grafoId);
    const signatures = partition.uncertain.map((c) => clusterSignature(c, nodes));
    const misses = partition.uncertain.filter((_, k) => !(signatures[k] in cache));
    const fresh = misses.length ? await this.judge(userId, misses, nodes) : {};
    const out = buildVerdictMap(signatures, cache, fresh);
    await this.verdicts.save(userId, grafoId, out);
    return out;
  }

  private async judge(
    userId: string,
    clusters: SimilarityCluster[],
    nodes: DuplicateGraphNode[],
  ): Promise<VerdictMap> {
    const signatures = clusters.map((c) => clusterSignature(c, nodes));
    const idToSignature = buildIdIndex(clusters, signatures, nodes);
    const groups = await this.llm.detectAmong(userId, shortlistNodes(clusters, nodes));
    return attributeGroups(groups, idToSignature, signatures);
  }
}

function buildVerdictMap(signatures: string[], cache: VerdictMap, fresh: VerdictMap): VerdictMap {
  const out: VerdictMap = {};
  for (const sig of signatures) out[sig] = sig in cache ? cache[sig] : (fresh[sig] ?? []);
  return out;
}

function buildIdIndex(
  clusters: SimilarityCluster[],
  signatures: string[],
  nodes: DuplicateGraphNode[],
): Map<string, string> {
  const idToSignature = new Map<string, string>();
  clusters.forEach((c, k) =>
    c.indices.forEach((i) => idToSignature.set(nodes[i].id, signatures[k])),
  );
  return idToSignature;
}
