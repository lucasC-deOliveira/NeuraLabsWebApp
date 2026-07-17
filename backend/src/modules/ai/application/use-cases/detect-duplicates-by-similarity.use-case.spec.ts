import { describe, it, expect } from 'vitest';
import { DetectDuplicatesBySimilarityUseCase } from './detect-duplicates-by-similarity.use-case';
import type {
  DuplicateGraphNode,
  DuplicateNodesRepository,
} from '../../domain/ports/duplicate-nodes-repository';
import type { EmbeddingPort } from '../../domain/ports/embedding-port';
import type {
  EmbeddingUpsert,
  NodeEmbeddingRepository,
  StoredEmbedding,
} from '../../domain/ports/node-embedding-repository';

class FakeDuplicateNodesRepository implements DuplicateNodesRepository {
  constructor(private nodes: DuplicateGraphNode[]) {}
  setNodes(nodes: DuplicateGraphNode[]): void {
    this.nodes = nodes;
  }
  async loadGraphNodes(): Promise<DuplicateGraphNode[]> {
    return this.nodes;
  }
}

// Deterministic embeddings keyed by name — "Stack" ≈ "Pilha", "Fila" far apart.
const VECTORS: Record<string, number[]> = {
  Pilha: [1, 0],
  Stack: [0.99, 0.14],
  Fila: [0, 1],
};

class FakeEmbeddingPort implements EmbeddingPort {
  readonly calls: string[][] = [];
  async embed(_userId: string, texts: string[]): Promise<number[][]> {
    this.calls.push(texts);
    return texts.map((t) => VECTORS[t] ?? [0, 0]);
  }
}

class FakeNodeEmbeddingRepository implements NodeEmbeddingRepository {
  readonly rows = new Map<string, EmbeddingUpsert>();
  async load(): Promise<StoredEmbedding[]> {
    return [...this.rows.values()].map(({ referenciaId, assinatura, vetor }) => ({
      referenciaId,
      assinatura,
      vetor,
    }));
  }
  async upsertMany(_userId: string, rows: EmbeddingUpsert[]): Promise<void> {
    for (const r of rows) this.rows.set(r.referenciaId, r);
  }
}

const node = (id: string, nome: string): DuplicateGraphNode => ({
  id,
  nome,
  tipo: 'CONCEITO',
  desc: '',
});

describe('DetectDuplicatesBySimilarityUseCase', () => {
  it('groups semantically similar nodes and leaves distinct ones out', async () => {
    const nodes = [node('n1', 'Pilha'), node('n2', 'Stack'), node('n3', 'Fila')];
    const useCase = new DetectDuplicatesBySimilarityUseCase(
      new FakeDuplicateNodesRepository(nodes),
      new FakeEmbeddingPort(),
      new FakeNodeEmbeddingRepository(),
    );

    const { groups } = await useCase.execute('u1', 'g1');

    expect(groups).toHaveLength(1);
    expect(groups[0].nodes.map((n) => n.id).sort()).toEqual(['n1', 'n2']);
  });

  it('returns no groups for a graph with fewer than two nodes', async () => {
    const useCase = new DetectDuplicatesBySimilarityUseCase(
      new FakeDuplicateNodesRepository([node('n1', 'Pilha')]),
      new FakeEmbeddingPort(),
      new FakeNodeEmbeddingRepository(),
    );
    expect(await useCase.execute('u1', 'g1')).toEqual({ groups: [] });
  });

  it('caches embeddings: a second run does not re-embed unchanged nodes', async () => {
    const nodes = [node('n1', 'Pilha'), node('n2', 'Stack')];
    const embeddings = new FakeEmbeddingPort();
    const useCase = new DetectDuplicatesBySimilarityUseCase(
      new FakeDuplicateNodesRepository(nodes),
      embeddings,
      new FakeNodeEmbeddingRepository(),
    );

    await useCase.execute('u1', 'g1');
    await useCase.execute('u1', 'g1');

    expect(embeddings.calls).toHaveLength(1); // embedded once, reused on the second run
  });

  it('re-embeds only the node whose name changed', async () => {
    const nodes = [node('n1', 'Pilha'), node('n2', 'Stack')];
    const repo = new FakeDuplicateNodesRepository(nodes);
    const embeddings = new FakeEmbeddingPort();
    const useCase = new DetectDuplicatesBySimilarityUseCase(
      repo,
      embeddings,
      new FakeNodeEmbeddingRepository(),
    );

    await useCase.execute('u1', 'g1');
    repo.setNodes([node('n1', 'Pilha'), node('n2', 'Fila')]); // n2 renamed
    await useCase.execute('u1', 'g1');

    expect(embeddings.calls[1]).toEqual(['Fila']); // only the renamed node re-embedded
  });
});
