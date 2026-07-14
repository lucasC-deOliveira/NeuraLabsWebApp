import { describe, it, expect } from 'vitest';
import { ImproveProvaQuestoesUseCase } from './improve-questoes-batch.use-case';
import type { LlmPort } from '../../domain/ports/llm-port';

class FakeLlm implements LlmPort {
  calls = 0;
  constructor(private readonly reply: string) {}
  async complete(): Promise<string> {
    this.calls++;
    return this.reply;
  }
}

const questoes = [
  {
    numero: 1,
    tipo: 'MULTIPLA_ESCOLHA',
    enunciado: 'q1',
    alternativas: [{ letra: 'A', texto: 'a' }],
    gabarito: 'A',
    explicacao: '',
  },
];

describe('ImproveProvaQuestoesUseCase', () => {
  it('improves all questions in a single LLM call', async () => {
    const llm = new FakeLlm(
      JSON.stringify({
        questoes: [
          {
            numero: 1,
            enunciado: '**Q1**',
            alternativas: [{ letra: 'A', texto: 'A' }],
            explicacao: '',
          },
        ],
      }),
    );
    const out = await new ImproveProvaQuestoesUseCase(llm).execute('u1', {
      questoes,
      operations: ['markdown'],
    });
    expect(llm.calls).toBe(1);
    expect(out[0].enunciado).toBe('**Q1**');
  });

  it('returns [] without calling the LLM when there are no questions', async () => {
    const llm = new FakeLlm('{}');
    const out = await new ImproveProvaQuestoesUseCase(llm).execute('u1', {
      questoes: [],
      operations: ['markdown'],
    });
    expect(out).toEqual([]);
    expect(llm.calls).toBe(0);
  });
});
