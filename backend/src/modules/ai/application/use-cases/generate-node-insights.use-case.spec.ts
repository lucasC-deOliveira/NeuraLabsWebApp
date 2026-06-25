import { describe, it, expect } from 'vitest';
import { GenerateNodeInsightsUseCase } from './generate-node-insights.use-case';
import { AiNodeNotFoundError } from '../../domain/errors';
import type {
  InsightContext,
  InsightContextRepository,
} from '../../domain/ports/insight-context-repository';
import type { RelationRulesPort } from '../../domain/ports/relation-rules-port';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeContext implements InsightContextRepository {
  constructor(private readonly ctx: InsightContext | null) {}
  async loadInsightContext(): Promise<InsightContext | null> {
    return this.ctx;
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
  isRelationAllowed: (_s, _t, relacao) => relacao === 'PREREQUISITO',
  insightTargets: () => [{ tipo: 'CONCEITO', relacoes: ['PREREQUISITO', 'DERIVA_DE'] }],
  canonicalDirection: () => null,
};

const ctx: InsightContext = {
  targetTipo: 'CONCEITO',
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
    );
    await expect(useCase.execute('u1', 'g1', 'missing')).rejects.toBeInstanceOf(
      AiNodeNotFoundError,
    );
  });

  it('validates insights and falls back to the default combo', async () => {
    const llm = new FakeLlm(
      '{"insights":[{"titulo":"T","tipoNo":"X","relacao":"NOPE"},{"titulo":"Skip"}]}',
    );
    const useCase = new GenerateNodeInsightsUseCase(new FakeContext(ctx), llm, rules);
    const res = await useCase.execute('u1', 'g1', 'c1');
    expect(res).toMatchObject({ nodeNome: 'Mitose', nodeTipo: 'CONCEITO' });
    // both insights have a disallowed combo → fall back to the default (CONCEITO/PREREQUISITO)
    expect(res.insights).toHaveLength(2);
    expect(res.insights[0]).toMatchObject({ tipoNo: 'CONCEITO', relacao: 'PREREQUISITO' });
    expect(llm.lastRequest?.temperature).toBe(0.5);
  });
});
