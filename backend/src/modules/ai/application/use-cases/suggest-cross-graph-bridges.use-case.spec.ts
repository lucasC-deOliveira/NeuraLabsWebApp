import { describe, it, expect } from 'vitest';
import { SuggestCrossGraphBridgesUseCase } from './suggest-cross-graph-bridges.use-case';
import { bridgePairKey } from '../../domain/services/cross-graph-bridges';
import type {
  BridgeCandidatesRepository,
  BridgeNode,
} from '../../domain/ports/bridge-candidates-repository';
import type { EmbeddingPort } from '../../domain/ports/embedding-port';
import type { LlmPort } from '../../domain/ports/llm-port';
import type {
  EmbeddingUpsert,
  NodeEmbeddingRepository,
  StoredEmbedding,
} from '../../domain/ports/node-embedding-repository';
import type { InsightTarget, RelationRulesPort } from '../../domain/ports/relation-rules-port';

const CONCEPT_RELATIONS = ['IS_A', 'PREREQUISITO', 'REFORCA', 'CONTRASTA_COM'];

// Angle on the unit circle → cosine similarity is the cosine of the angle.
function onCircle(deg: number): number[] {
  const rad = (deg * Math.PI) / 180;
  return [Math.cos(rad), Math.sin(rad)];
}

function node(id: string, grafoId: string): BridgeNode {
  return {
    id,
    nome: `nome-${id}`,
    tipo: 'CONCEITO',
    desc: '',
    grafoId,
    grafoNome: `grafo-${grafoId}`,
  };
}

class FakeBridgeCandidatesRepository implements BridgeCandidatesRepository {
  constructor(
    private readonly inside: BridgeNode[],
    private readonly outside: BridgeNode[],
    private readonly existing: Set<string> = new Set(),
  ) {}
  loadConceptsInGraph(): Promise<BridgeNode[]> {
    return Promise.resolve(this.inside);
  }
  loadConceptsOutsideGraph(): Promise<BridgeNode[]> {
    return Promise.resolve(this.outside);
  }
  loadExistingPairKeys(): Promise<Set<string>> {
    return Promise.resolve(this.existing);
  }
}

// Embeds by name: "nome-a" → the angle registered for "a".
class FakeEmbeddingPort implements EmbeddingPort {
  public calls = 0;
  constructor(private readonly anglesByName: Record<string, number>) {}
  embed(_userId: string, texts: string[]): Promise<number[][]> {
    this.calls++;
    return Promise.resolve(texts.map((t) => onCircle(this.anglesByName[t] ?? 0)));
  }
}

class FakeNodeEmbeddingRepository implements NodeEmbeddingRepository {
  public rows: EmbeddingUpsert[] = [];
  load(): Promise<StoredEmbedding[]> {
    return Promise.resolve([]);
  }
  upsertMany(_userId: string, rows: EmbeddingUpsert[]): Promise<void> {
    this.rows.push(...rows);
    return Promise.resolve();
  }
}

class FakeLlm implements LlmPort {
  public calls = 0;
  constructor(private readonly reply: string | Error) {}
  complete(): Promise<string> {
    this.calls++;
    if (this.reply instanceof Error) return Promise.reject(this.reply);
    return Promise.resolve(this.reply);
  }
}

class FakeRelationRules implements RelationRulesPort {
  allowedNotaRelations(): string[] {
    return [];
  }
  isNotaRelationAllowed(): boolean {
    return false;
  }
  isRelationAllowed(_source: string, _target: string, relacao: string): boolean {
    return CONCEPT_RELATIONS.includes(relacao);
  }
  insightTargets(): InsightTarget[] {
    return [];
  }
  canonicalDirection(): [string, string] | null {
    return null;
  }
}

function buildUseCase(
  repo: BridgeCandidatesRepository,
  embeddings: EmbeddingPort,
  llm: FakeLlm,
): SuggestCrossGraphBridgesUseCase {
  return new SuggestCrossGraphBridgesUseCase(
    repo,
    embeddings,
    new FakeNodeEmbeddingRepository(),
    llm,
    new FakeRelationRules(),
  );
}

describe('SuggestCrossGraphBridgesUseCase', () => {
  const angles = { 'nome-a': 0, 'nome-b': 20 };

  it('suggests a bridge and uses the relation named by the LLM', async () => {
    const repo = new FakeBridgeCandidatesRepository([node('a', 'g1')], [node('b', 'g2')]);
    const llm = new FakeLlm(
      '{"relacoes":[{"indice":0,"relacao":"PREREQUISITO","motivo":"base de"}]}',
    );

    const { suggestions } = await buildUseCase(repo, new FakeEmbeddingPort(angles), llm).execute(
      'u1',
      'g1',
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      sourceId: 'a',
      targetId: 'b',
      relacao: 'PREREQUISITO',
      motivo: 'base de',
      targetGrafoNome: 'grafo-g2',
    });
  });

  it('drops the pairs the LLM rejects, since cosine alone pairs unrelated names', async () => {
    const repo = new FakeBridgeCandidatesRepository([node('a', 'g1')], [node('b', 'g2')]);
    const llm = new FakeLlm('{"relacoes":[{"indice":0,"relacao":"NENHUMA"}]}');

    const { suggestions } = await buildUseCase(repo, new FakeEmbeddingPort(angles), llm).execute(
      'u1',
      'g1',
    );

    expect(suggestions).toEqual([]);
  });

  it('falls back to a neutral relation when the LLM names an invalid one', async () => {
    const repo = new FakeBridgeCandidatesRepository([node('a', 'g1')], [node('b', 'g2')]);
    const llm = new FakeLlm('{"relacoes":[{"indice":0,"relacao":"INVENTADA"}]}');

    const { suggestions } = await buildUseCase(repo, new FakeEmbeddingPort(angles), llm).execute(
      'u1',
      'g1',
    );

    expect(suggestions[0].relacao).toBe('REFORCA');
  });

  it('keeps the candidates when the LLM call fails outright', async () => {
    const repo = new FakeBridgeCandidatesRepository([node('a', 'g1')], [node('b', 'g2')]);
    const llm = new FakeLlm(new Error('provider offline'));

    const { suggestions } = await buildUseCase(repo, new FakeEmbeddingPort(angles), llm).execute(
      'u1',
      'g1',
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].relacao).toBe('REFORCA');
    expect(suggestions[0].motivo).toContain('grafo-g1');
  });

  it('does not call the LLM when there is no candidate to name', async () => {
    const repo = new FakeBridgeCandidatesRepository(
      [node('a', 'g1')],
      [node('b', 'g2')],
      new Set([bridgePairKey('a', 'b')]),
    );
    const llm = new FakeLlm('{}');

    const { suggestions } = await buildUseCase(repo, new FakeEmbeddingPort(angles), llm).execute(
      'u1',
      'g1',
    );

    expect(suggestions).toEqual([]);
    expect(llm.calls).toBe(0);
  });

  it('short-circuits without embedding when the user has a single graph', async () => {
    const repo = new FakeBridgeCandidatesRepository([node('a', 'g1')], []);
    const embeddings = new FakeEmbeddingPort(angles);
    const llm = new FakeLlm('{}');

    const { suggestions } = await buildUseCase(repo, embeddings, llm).execute('u1', 'g1');

    expect(suggestions).toEqual([]);
    expect(embeddings.calls).toBe(0);
    expect(llm.calls).toBe(0);
  });
});
