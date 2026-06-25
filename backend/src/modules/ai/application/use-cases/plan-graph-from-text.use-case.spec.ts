import { describe, it, expect } from 'vitest';
import { PlanGraphFromTextUseCase } from './plan-graph-from-text.use-case';
import { EmptyAiContentError, EmptyTextError } from '../../domain/errors';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeNames implements GraphNameIndexRepository {
  async loadNameIndex(): Promise<{ nameIndex: Map<string, string>; existingContext: string }> {
    return { nameIndex: new Map(), existingContext: ' CTX' };
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

describe('PlanGraphFromTextUseCase', () => {
  it('rejects empty text without calling the model', async () => {
    const llm = new FakeLlm('{}');
    const useCase = new PlanGraphFromTextUseCase(new FakeNames(), llm);
    await expect(useCase.execute('u1', 'g1', '  ')).rejects.toBeInstanceOf(EmptyTextError);
    expect(llm.lastRequest).toBeNull();
  });

  it('throws when the model returns no content', async () => {
    const useCase = new PlanGraphFromTextUseCase(new FakeNames(), new FakeLlm(''));
    await expect(useCase.execute('u1', 'g1', 'texto')).rejects.toBeInstanceOf(EmptyAiContentError);
  });

  it('returns the parsed plan and uses a high token budget', async () => {
    const llm = new FakeLlm('{"assunto":{"nome":"Bio"}}');
    const useCase = new PlanGraphFromTextUseCase(new FakeNames(), llm);
    const res = await useCase.execute('u1', 'g1', 'texto');
    expect(res).toEqual({ plan: { assunto: { nome: 'Bio' } } });
    expect(llm.lastRequest?.maxTokens).toBe(6000);
  });
});
