import { selectDuplicateGroups, type DuplicateGroup } from '../../domain/services/duplicate-groups';
import {
  similarityRawGroups,
  type SimilarityItem,
} from '../../domain/services/embedding-similarity';
import { ensureNodeVectors } from '../ensure-node-vectors';
import type { DuplicateNodesRepository } from '../../domain/ports/duplicate-nodes-repository';
import type { EmbeddingPort } from '../../domain/ports/embedding-port';
import type { NodeEmbeddingRepository } from '../../domain/ports/node-embedding-repository';

/**
 * Detects semantic duplicate nodes by embedding-vector cosine similarity — the
 * scalable, LLM-free alternative for large graphs (no prompt-size cap). Embeddings
 * are cached per node and only recomputed when a name changes.
 * @example detectDuplicatesBySimilarity.execute('u1', 'g1', 0.86)
 */
export class DetectDuplicatesBySimilarityUseCase {
  constructor(
    private readonly nodes: DuplicateNodesRepository,
    private readonly embeddings: EmbeddingPort,
    private readonly store: NodeEmbeddingRepository,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    threshold?: number,
  ): Promise<{ groups: DuplicateGroup[] }> {
    const nodes = await this.nodes.loadGraphNodes(userId, grafoId);
    if (nodes.length < 2) return { groups: [] };
    const vectors = await ensureNodeVectors(this.embeddings, this.store, userId, nodes);
    const items: SimilarityItem[] = nodes.map((n, i) => ({ tipo: n.tipo, vetor: vectors[i] }));
    return { groups: selectDuplicateGroups(similarityRawGroups(items, threshold), nodes) };
  }
}
