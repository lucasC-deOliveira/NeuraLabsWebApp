import { describe, it, expect, vi } from 'vitest';
import { GenerateGraphFromTextUseCase } from './generate-graph-from-text.use-case';
import { BuildGraphFromPlanUseCase } from './build-graph-from-plan.use-case';
import { EmptyTextError } from '../../domain/errors';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { LlmPort } from '../../domain/ports/llm-port';

class FakeNames implements GraphNameIndexRepository {
  async loadNameIndex(): Promise<{ nameIndex: Map<string, string>; existingContext: string }> {
    return { nameIndex: new Map(), existingContext: '' };
  }
}

class FakeLlm implements LlmPort {
  constructor(private readonly response: string) {}
  async complete(): Promise<string> {
    return this.response;
  }
}

const builderResult = {
  assunto: 'Bio',
  topicos: 0,
  conceitos: 0,
  notas: 0,
  flashcards: 0,
  baralho: null,
};

describe('GenerateGraphFromTextUseCase', () => {
  it('rejects empty text', async () => {
    const builder = { execute: vi.fn() } as unknown as BuildGraphFromPlanUseCase;
    const useCase = new GenerateGraphFromTextUseCase(new FakeNames(), new FakeLlm('{}'), builder);
    await expect(useCase.execute('u1', 'g1', ' ')).rejects.toBeInstanceOf(EmptyTextError);
  });

  it('generates a plan and delegates persistence to the builder', async () => {
    const execute = vi.fn().mockResolvedValue(builderResult);
    const builder = { execute } as unknown as BuildGraphFromPlanUseCase;
    const llm = new FakeLlm('{"assunto":{"nome":"Bio"}}');
    const useCase = new GenerateGraphFromTextUseCase(new FakeNames(), llm, builder);

    const res = await useCase.execute('u1', 'g1', 'texto');

    expect(res).toBe(builderResult);
    expect(execute).toHaveBeenCalledWith('u1', 'g1', 'texto', { assunto: { nome: 'Bio' } }, true);
  });
});
