import { describe, it, expect, vi } from 'vitest';
import { DetectDuplicatesHybridUseCase } from './detect-duplicates-hybrid.use-case';
import type { DetectDuplicatesUseCase } from './detect-duplicates.use-case';
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
import type {
  DuplicateVerdictRepository,
  VerdictMap,
} from '../../domain/ports/duplicate-verdict-repository';
import type { DuplicateGroup } from '../../domain/services/duplicate-groups';

class FakeDuplicateNodesRepository implements DuplicateNodesRepository {
  constructor(private nodes: DuplicateGraphNode[]) {}
  setNodes(nodes: DuplicateGraphNode[]): void {
    this.nodes = nodes;
  }
  async loadGraphNodes(): Promise<DuplicateGraphNode[]> {
    return this.nodes;
  }
}

// Pilha≡Stack (idênticos → auto-accept). Vetor~Array (~0.9 → banda incerta → LLM).
const VECTORS: Record<string, number[]> = {
  Pilha: [1, 0, 0],
  Stack: [1, 0, 0],
  Vetor: [0, 1, 0],
  Array: [0, 0.9, 0.436],
  Arranjo: [0, 0.9, 0.436], // ~0.9 com Vetor: continua candidato, mas muda a assinatura
};

class FakeEmbeddingPort implements EmbeddingPort {
  async embed(_userId: string, texts: string[]): Promise<number[][]> {
    return texts.map((t) => VECTORS[t] ?? [0, 0, 0]);
  }
}

class FakeNodeEmbeddingRepository implements NodeEmbeddingRepository {
  readonly rows = new Map<string, EmbeddingUpsert>();
  async load(): Promise<StoredEmbedding[]> {
    return [...this.rows.values()];
  }
  async upsertMany(_u: string, rows: EmbeddingUpsert[]): Promise<void> {
    for (const r of rows) this.rows.set(r.referenciaId, r);
  }
}

class FakeDuplicateVerdictRepository implements DuplicateVerdictRepository {
  readonly store = new Map<string, VerdictMap>();
  async load(grafoId: string): Promise<VerdictMap> {
    return this.store.get(grafoId) ?? {};
  }
  async save(_userId: string, grafoId: string, dados: VerdictMap): Promise<void> {
    this.store.set(grafoId, dados);
  }
}

const node = (id: string, nome: string): DuplicateGraphNode => ({
  id,
  nome,
  tipo: 'CONCEITO',
  desc: '',
});

// Stub of the LLM detector: confirms Vetor+Array as one group when it sees them.
function makeDetect(): { useCase: DetectDuplicatesUseCase; spy: ReturnType<typeof vi.fn> } {
  const spy = vi.fn(
    async (_userId: string, nodes: DuplicateGraphNode[]): Promise<DuplicateGroup[]> => {
      const ids = nodes.map((n) => n.id);
      if (ids.includes('n3') && ids.includes('n4')) {
        return [
          {
            nodes: [
              { id: 'n3', nome: 'Vetor', tipo: 'CONCEITO' },
              { id: 'n4', nome: 'Array', tipo: 'CONCEITO' },
            ],
            sugestao: 'mesmo conceito',
          },
        ];
      }
      return [];
    },
  );
  return { useCase: { detectAmong: spy } as unknown as DetectDuplicatesUseCase, spy };
}

function build(nodes: DuplicateGraphNode[]) {
  const repo = new FakeDuplicateNodesRepository(nodes);
  const verdicts = new FakeDuplicateVerdictRepository();
  const { useCase: detect, spy } = makeDetect();
  const useCase = new DetectDuplicatesHybridUseCase(
    repo,
    new FakeEmbeddingPort(),
    new FakeNodeEmbeddingRepository(),
    verdicts,
    detect,
  );
  return { useCase, repo, spy };
}

const graph = (): DuplicateGraphNode[] => [
  node('n1', 'Pilha'),
  node('n2', 'Stack'),
  node('n3', 'Vetor'),
  node('n4', 'Array'),
];

describe('DetectDuplicatesHybridUseCase', () => {
  it('auto-accepts high-confidence clusters and confirms uncertain ones via the LLM', async () => {
    const { useCase, spy } = build(graph());

    const { groups } = await useCase.execute('u1', 'g1');

    const ids = groups.map((g) => g.nodes.map((n) => n.id).sort());
    expect(ids).toContainEqual(['n1', 'n2']); // auto-accepted (identical vectors)
    expect(ids).toContainEqual(['n3', 'n4']); // LLM-confirmed
    // the LLM only saw the uncertain shortlist, never the auto-accepted pair
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1].map((n: DuplicateGraphNode) => n.id).sort()).toEqual(['n3', 'n4']);
  });

  it('reuses the cache on a re-run with no changes (no second LLM call)', async () => {
    const { useCase, spy } = build(graph());
    await useCase.execute('u1', 'g1');
    await useCase.execute('u1', 'g1');
    expect(spy).toHaveBeenCalledTimes(1); // second run served entirely from cache
  });

  it('re-judges only when a candidate cluster changes', async () => {
    const { useCase, repo, spy } = build(graph());
    await useCase.execute('u1', 'g1');
    repo.setNodes([
      node('n1', 'Pilha'),
      node('n2', 'Stack'),
      node('n3', 'Vetor'),
      node('n4', 'Arranjo'),
    ]);
    await useCase.execute('u1', 'g1');
    expect(spy).toHaveBeenCalledTimes(2); // n4 renamed → its cluster signature changed
  });

  it('returns no groups for a graph with fewer than two nodes', async () => {
    const { useCase } = build([node('n1', 'Pilha')]);
    expect(await useCase.execute('u1', 'g1')).toEqual({ groups: [] });
  });
});
