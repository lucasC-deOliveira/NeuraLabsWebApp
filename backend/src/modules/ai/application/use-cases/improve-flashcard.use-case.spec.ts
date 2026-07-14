import { describe, it, expect } from 'vitest';
import { ImproveFlashcardUseCase } from './improve-flashcard.use-case';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeLlm implements LlmPort {
  lastRequest: LlmRequest | null = null;
  constructor(private readonly reply: string) {}
  async complete(request: LlmRequest): Promise<string> {
    this.lastRequest = request;
    return this.reply;
  }
}

describe('ImproveFlashcardUseCase', () => {
  it('returns the improved pergunta/resposta parsed from the model', async () => {
    const llm = new FakeLlm(JSON.stringify({ pergunta: '**O que é X?**', resposta: '- def' }));
    const useCase = new ImproveFlashcardUseCase(llm);

    const out = await useCase.execute('u1', {
      pergunta: 'o que e x',
      resposta: 'def',
      operations: ['markdown', 'content'],
    });

    expect(out).toEqual({ pergunta: '**O que é X?**', resposta: '- def' });
    // token budget is bounded and the prompt carries the content (no graph context)
    expect(llm.lastRequest?.maxTokens).toBeLessThanOrEqual(2000);
    expect(llm.lastRequest?.messages[1].content).toContain('o que e x');
  });

  it('keeps the original fields when the model returns nothing useful', async () => {
    const useCase = new ImproveFlashcardUseCase(new FakeLlm(''));
    const out = await useCase.execute('u1', {
      pergunta: 'Q',
      resposta: 'A',
      operations: ['format'],
    });
    expect(out).toEqual({ pergunta: 'Q', resposta: 'A' });
  });

  it('rejects a call with no valid operations', async () => {
    const useCase = new ImproveFlashcardUseCase(new FakeLlm('{}'));
    await expect(
      useCase.execute('u1', { pergunta: 'Q', resposta: 'A', operations: [] }),
    ).rejects.toThrow(/no valid improve operations/);
  });
});
