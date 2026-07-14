import { describe, it, expect } from 'vitest';
import { ImproveQuestaoUseCase } from './improve-questao.use-case';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeLlm implements LlmPort {
  lastRequest: LlmRequest | null = null;
  constructor(private readonly reply: string) {}
  async complete(request: LlmRequest): Promise<string> {
    this.lastRequest = request;
    return this.reply;
  }
}

const input = {
  tipo: 'MULTIPLA_ESCOLHA',
  enunciado: 'qual e a capital',
  alternativas: [
    { letra: 'A', texto: 'sao paulo' },
    { letra: 'B', texto: 'brasilia' },
  ],
  gabarito: 'B',
  explicacao: 'brasilia',
  operations: ['markdown'] as unknown,
};

describe('ImproveQuestaoUseCase', () => {
  it('returns the improved question, preserving the answer key', async () => {
    const llm = new FakeLlm(
      JSON.stringify({
        enunciado: 'Qual é a **capital**?',
        alternativas: [
          { letra: 'A', texto: 'São Paulo' },
          { letra: 'B', texto: 'Brasília' },
        ],
        explicacao: 'Brasília.',
      }),
    );
    const out = await new ImproveQuestaoUseCase(llm).execute('u1', input);

    expect(out.enunciado).toBe('Qual é a **capital**?');
    expect(out.alternativas.map((a) => a.letra)).toEqual(['A', 'B']); // letras preservadas
    expect(llm.lastRequest?.maxTokens).toBeLessThanOrEqual(2500);
  });

  it('rejects a call with no valid operations', async () => {
    const useCase = new ImproveQuestaoUseCase(new FakeLlm('{}'));
    await expect(useCase.execute('u1', { ...input, operations: [] })).rejects.toThrow(
      /no valid improve operations/,
    );
  });
});
