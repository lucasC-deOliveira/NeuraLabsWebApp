import { describe, it, expect } from 'vitest';
import { AutoLinkGraphUseCase } from './auto-link-graph.use-case';
import type { AutoLinkData, AutoLinkRepository } from '../../domain/ports/auto-link-repository';
import type { RelationRulesPort } from '../../domain/ports/relation-rules-port';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeRepo implements AutoLinkRepository {
  constructor(private readonly data: AutoLinkData) {}
  async loadAutoLinkData(): Promise<AutoLinkData> {
    return this.data;
  }
}

class FakeLlm implements LlmPort {
  lastRequest: LlmRequest | null = null;
  constructor(private readonly response: string) {}
  async complete(request: LlmRequest): Promise<string> {
    this.lastRequest = request;
    return this.response;
  }
}

const rules: RelationRulesPort = {
  allowedNotaRelations: () => [],
  isNotaRelationAllowed: () => true,
  isRelationAllowed: (_s, _t, relacao) => relacao === 'IS_A',
  insightTargets: () => [],
};

const data: AutoLinkData = {
  nodes: [
    { id: 'c1', tipo: 'CONCEITO', nome: 'C1' },
    { id: 'c2', tipo: 'CONCEITO', nome: 'C2' },
  ],
  existingPairs: new Set<string>(),
};

describe('AutoLinkGraphUseCase', () => {
  it('returns no suggestions with fewer than two nodes', async () => {
    const llm = new FakeLlm('{"suggestions":[{"sourceId":"c1","targetId":"c2","relacao":"IS_A"}]}');
    const useCase = new AutoLinkGraphUseCase(
      new FakeRepo({ nodes: [data.nodes[0]], existingPairs: new Set() }),
      llm,
      rules,
    );
    expect(await useCase.execute('u1', 'g1')).toEqual({ suggestions: [] });
    expect(llm.lastRequest).toBeNull();
  });

  it('validates the model edges against the rules', async () => {
    const llm = new FakeLlm(
      '{"suggestions":[{"sourceId":"c1","targetId":"c2","relacao":"NOPE"},{"sourceId":"c1","targetId":"c2","relacao":"IS_A","motivo":"m"}]}',
    );
    const useCase = new AutoLinkGraphUseCase(new FakeRepo(data), llm, rules);
    const res = await useCase.execute('u1', 'g1');
    expect(res.suggestions).toHaveLength(1);
    expect(res.suggestions[0]).toMatchObject({ sourceId: 'c1', targetId: 'c2', relacao: 'IS_A' });
    expect(llm.lastRequest?.maxTokens).toBe(4000);
  });
});
