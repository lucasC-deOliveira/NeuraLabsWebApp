import { describe, it, expect } from 'vitest';
import { AnalyzeRawTextUseCase } from './analyze-raw-text.use-case';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeLlm implements LlmPort {
  lastRequest: LlmRequest | null = null;
  constructor(private readonly response: string) {}
  async complete(request: LlmRequest): Promise<string> {
    this.lastRequest = request;
    return this.response;
  }
}

describe('AnalyzeRawTextUseCase', () => {
  it('returns no candidates for blank input without calling the model', async () => {
    const llm = new FakeLlm('{"notas":[{"titulo":"X"}]}');
    const useCase = new AnalyzeRawTextUseCase(llm);
    expect(await useCase.execute('u1', '   ')).toEqual({ candidatas: [] });
    expect(llm.lastRequest).toBeNull();
  });

  it('maps the model notes into candidates', async () => {
    const llm = new FakeLlm('{"notas":[{"titulo":"T","conteudo":"c"}]}');
    const useCase = new AnalyzeRawTextUseCase(llm);
    expect(await useCase.execute('u1', 'texto')).toEqual({
      candidatas: [{ titulo: 'T', conteudo: 'c', conceitosPrevistos: [] }],
    });
  });

  it('falls back to a single note with the raw text on invalid JSON', async () => {
    const useCase = new AnalyzeRawTextUseCase(new FakeLlm('not json'));
    expect(await useCase.execute('u1', 'meu texto')).toEqual({
      candidatas: [{ titulo: 'Nota', conteudo: 'meu texto', conceitosPrevistos: [] }],
    });
  });
});
