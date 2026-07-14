import { describe, it, expect } from 'vitest';
import { GenerateNodeInsightsUseCase } from './generate-node-insights.use-case';
import { AiNodeNotFoundError } from '../../domain/errors';
import type {
  InsightContext,
  InsightContextRepository,
} from '../../domain/ports/insight-context-repository';
import type { RelationRulesPort } from '../../domain/ports/relation-rules-port';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';
import type {
  CachedNodeInsights,
  NodeInsightsCacheRepository,
} from '../../domain/ports/node-insights-cache-repository';
import type { NodeInsightsResult } from '../../domain/services/node-insights';

class FakeContext implements InsightContextRepository {
  constructor(private readonly ctx: InsightContext | null) {}
  async loadInsightContext(): Promise<InsightContext | null> {
    return this.ctx;
  }
}

class FakeLlm implements LlmPort {
  lastRequest: LlmRequest | null = null;
  calls = 0;
  constructor(private readonly response: string) {}
  async complete(request: LlmRequest): Promise<string> {
    this.lastRequest = request;
    this.calls++;
    return this.response;
  }
}

class FakeInsightsCache implements NodeInsightsCacheRepository {
  entry: CachedNodeInsights | null = null;
  saved: { assinatura: string; result: NodeInsightsResult } | null = null;
  async load(): Promise<CachedNodeInsights | null> {
    return this.entry;
  }
  async save(_u: string, _g: string, _n: string, assinatura: string, result: NodeInsightsResult) {
    this.saved = { assinatura, result };
  }
}

const rules: RelationRulesPort = {
  allowedNotaRelations: () => [],
  isNotaRelationAllowed: () => true,
  isRelationAllowed: (_s, _t, relacao) => relacao === 'PREREQUISITO',
  insightTargets: () => [{ tipo: 'CONCEITO', relacoes: ['PREREQUISITO', 'DERIVA_DE'] }],
  canonicalDirection: () => null,
};

const ctx: InsightContext = {
  targetTipo: 'CONCEITO',
  grafoNome: 'Biologia',
  target: { id: 'c1', tipo: 'CONCEITO', nome: 'Mitose', corpo: 'desc' },
  neighbors: [],
  others: [],
};

describe('GenerateNodeInsightsUseCase', () => {
  it('throws when the target node is not found', async () => {
    const useCase = new GenerateNodeInsightsUseCase(
      new FakeContext(null),
      new FakeLlm('{}'),
      rules,
      new FakeInsightsCache(),
    );
    await expect(useCase.execute('u1', 'g1', 'missing')).rejects.toBeInstanceOf(
      AiNodeNotFoundError,
    );
  });

  it('validates insights and falls back to the default combo', async () => {
    const llm = new FakeLlm(
      '{"insights":[{"titulo":"T","tipoNo":"X","relacao":"NOPE"},{"titulo":"Skip"}]}',
    );
    const cache = new FakeInsightsCache();
    const useCase = new GenerateNodeInsightsUseCase(new FakeContext(ctx), llm, rules, cache);
    const res = await useCase.execute('u1', 'g1', 'c1');
    expect(res).toMatchObject({ nodeNome: 'Mitose', nodeTipo: 'CONCEITO' });
    // both insights have a disallowed combo → fall back to the default (CONCEITO/PREREQUISITO)
    expect(res.insights).toHaveLength(2);
    expect(res.insights[0]).toMatchObject({ tipoNo: 'CONCEITO', relacao: 'PREREQUISITO' });
    expect(llm.lastRequest?.temperature).toBe(0.5);
    expect(cache.saved?.result).toBe(res); // fresh result is persisted
  });

  it('reuses the cache when the signature matches, skipping the LLM', async () => {
    const llm = new FakeLlm('{"insights":[{"titulo":"T","tipoNo":"CONCEITO","relacao":"PREREQUISITO"}]}');
    const cache = new FakeInsightsCache();
    const useCase = new GenerateNodeInsightsUseCase(new FakeContext(ctx), llm, rules, cache);
    const first = await useCase.execute('u1', 'g1', 'c1'); // populates cache.saved
    cache.entry = { assinatura: cache.saved!.assinatura, result: first };

    const second = await useCase.execute('u1', 'g1', 'c1');
    expect(second).toBe(first);
    expect(llm.calls).toBe(1); // second call served from cache
  });

  it('refresh bypasses the cache and calls the LLM again', async () => {
    const llm = new FakeLlm('{"insights":[{"titulo":"T","tipoNo":"CONCEITO","relacao":"PREREQUISITO"}]}');
    const cache = new FakeInsightsCache();
    const useCase = new GenerateNodeInsightsUseCase(new FakeContext(ctx), llm, rules, cache);
    const first = await useCase.execute('u1', 'g1', 'c1');
    cache.entry = { assinatura: cache.saved!.assinatura, result: first };

    await useCase.execute('u1', 'g1', 'c1', { refresh: true });
    expect(llm.calls).toBe(2);
  });
});
