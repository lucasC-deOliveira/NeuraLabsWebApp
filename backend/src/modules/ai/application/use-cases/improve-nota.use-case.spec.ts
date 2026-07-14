import { describe, it, expect } from 'vitest';
import { ImproveNotaUseCase } from './improve-nota.use-case';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeLlm implements LlmPort {
  lastRequest: LlmRequest | null = null;
  constructor(private readonly reply: string) {}
  async complete(request: LlmRequest): Promise<string> {
    this.lastRequest = request;
    return this.reply;
  }
}

describe('ImproveNotaUseCase', () => {
  it('returns the improved titulo/conteudo parsed from the model', async () => {
    const llm = new FakeLlm(JSON.stringify({ titulo: 'Fotossíntese', conteudo: '## Resumo' }));
    const out = await new ImproveNotaUseCase(llm).execute('u1', {
      titulo: 'fotossintese',
      conteudo: 'resumo',
      operations: ['markdown'],
    });
    expect(out).toEqual({ titulo: 'Fotossíntese', conteudo: '## Resumo' });
    expect(llm.lastRequest?.messages[1].content).toContain('fotossintese');
  });

  it('rejects a call with no valid operations', async () => {
    const useCase = new ImproveNotaUseCase(new FakeLlm('{}'));
    await expect(
      useCase.execute('u1', { titulo: 'T', conteudo: 'C', operations: [] }),
    ).rejects.toThrow(/no valid improve operations/);
  });
});
