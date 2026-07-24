import { describe, it, expect } from 'vitest';
import { GradeFeynmanExplanationUseCase } from './grade-feynman-explanation.use-case';
import type {
  FeynmanContextSource,
  FeynmanTargetContext,
} from '../../domain/ports/feynman-context-source';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeContextSource implements FeynmanContextSource {
  constructor(private readonly ctx: FeynmanTargetContext | null) {}
  load(): Promise<FeynmanTargetContext | null> {
    return Promise.resolve(this.ctx);
  }
}

class FakeLlm implements LlmPort {
  public seen: LlmRequest | null = null;
  constructor(private readonly reply: string) {}
  complete(request: LlmRequest): Promise<string> {
    this.seen = request;
    return Promise.resolve(this.reply);
  }
}

const ctx: FeynmanTargetContext = {
  nome: 'Heap',
  descricao: 'Estrutura de dados...',
  material: ['pergunta X'],
  candidatos: [{ id: 'c1', nome: 'Prioridade' }],
};

describe('GradeFeynmanExplanationUseCase', () => {
  it('returns null when the target is not found (no LLM call)', async () => {
    const llm = new FakeLlm('{}');
    const useCase = new GradeFeynmanExplanationUseCase(new FakeContextSource(null), llm);
    expect(await useCase.execute('u1', 'CONCEITO', 'missing', 'texto')).toBeNull();
    expect(llm.seen).toBeNull();
  });

  it('grades the explanation and maps gaps to concept ids', async () => {
    const reply = JSON.stringify({
      clareza: 70,
      jargao: ['heapify'],
      lacunas: [{ ponto: 'não citou prioridade', conceito: 'Prioridade' }],
      analogia: 'fila do hospital',
      reescrita: 'É um jeito de...',
    });
    const useCase = new GradeFeynmanExplanationUseCase(
      new FakeContextSource(ctx),
      new FakeLlm(reply),
    );

    const fb = await useCase.execute('u1', 'CONCEITO', 'c0', 'minha explicação');

    expect(fb?.clareza).toBe(70);
    expect(fb?.jargao).toEqual(['heapify']);
    expect(fb?.lacunas).toEqual([{ ponto: 'não citou prioridade', conceitoId: 'c1' }]);
  });

  it('injects the angle rubric into the system prompt', async () => {
    const llm = new FakeLlm('{}');
    const useCase = new GradeFeynmanExplanationUseCase(new FakeContextSource(ctx), llm);

    await useCase.execute('u1', 'CONCEITO', 'c0', 'minha explicação', 'TECNICO');

    const system = llm.seen?.messages.find((m) => m.role === 'system')?.content ?? '';
    expect(system).toContain('MODO TÉCNICO');
  });
});
