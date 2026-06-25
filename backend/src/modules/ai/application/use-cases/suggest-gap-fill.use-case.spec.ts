import { describe, it, expect } from 'vitest';
import { SuggestGapFillUseCase } from './suggest-gap-fill.use-case';
import type { GapRulesPort } from '../../domain/ports/gap-rules-port';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeLlm implements LlmPort {
  lastRequest: LlmRequest | null = null;
  constructor(private readonly response: string) {}
  async complete(request: LlmRequest): Promise<string> {
    this.lastRequest = request;
    return this.response;
  }
}

const rules: GapRulesPort = {
  gapTargets: () => [{ tipo: 'CONCEITO', relacoes: ['PREREQUISITO'] }],
};

const input = { labelsA: ['A1'], labelsB: ['B1'], bridgeA: 'A1', bridgeB: 'B1' };

describe('SuggestGapFillUseCase', () => {
  it('returns nothing when either cluster is empty', async () => {
    const llm = new FakeLlm('{"insights":[{"titulo":"X"}]}');
    const useCase = new SuggestGapFillUseCase(llm, rules);
    expect(await useCase.execute('u1', 'g1', { ...input, labelsB: [] })).toEqual({ insights: [] });
    expect(llm.lastRequest).toBeNull();
  });

  it('parses the model insights as gap insights (category Lacuna)', async () => {
    const llm = new FakeLlm('{"insights":[{"titulo":"Ponte","tipoNo":"CONCEITO","relacao":"X"}]}');
    const useCase = new SuggestGapFillUseCase(llm, rules);
    const res = await useCase.execute('u1', 'g1', input);
    expect(res.insights).toHaveLength(1);
    expect(res.insights[0]).toMatchObject({ categoria: 'Lacuna', titulo: 'Ponte' });
  });

  it('returns nothing when the model output is invalid JSON', async () => {
    const useCase = new SuggestGapFillUseCase(new FakeLlm('nope'), rules);
    expect(await useCase.execute('u1', 'g1', input)).toEqual({ insights: [] });
  });
});
