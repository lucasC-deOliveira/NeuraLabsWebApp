import { describe, it, expect } from 'vitest';
import { GenerateStudyAidUseCase } from './generate-study-aid.use-case';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

const card = { pergunta: 'Qual a capital da França?', resposta: 'Paris', conceito: 'Geografia' };

class FakeLlm implements LlmPort {
  public lastMessages: LlmMessage[] = [];
  constructor(private readonly reply: string | Error) {}
  complete(input: { messages: LlmMessage[] }): Promise<string> {
    this.lastMessages = input.messages;
    if (this.reply instanceof Error) return Promise.reject(this.reply);
    return Promise.resolve(this.reply);
  }
}

describe('GenerateStudyAidUseCase', () => {
  it('returns the hint text from the model', async () => {
    const llm = new FakeLlm('{"texto":"Pense num monumento de ferro."}');

    const { texto } = await new GenerateStudyAidUseCase(llm).execute('u1', 'hint', card);

    expect(texto).toBe('Pense num monumento de ferro.');
  });

  // A garantia que mais importa: a resposta não pode chegar ao modelo numa dica.
  it('never sends the answer to the model when generating a hint', async () => {
    const llm = new FakeLlm('{"texto":"dica"}');

    await new GenerateStudyAidUseCase(llm).execute('u1', 'hint', card);

    const sent = llm.lastMessages.map((m) => m.content).join('\n');
    expect(sent).not.toContain('Paris');
  });

  it('gives an empty aid instead of throwing when the model returns junk', async () => {
    const llm = new FakeLlm('desculpe, não consegui');

    const { texto } = await new GenerateStudyAidUseCase(llm).execute('u1', 'mnemonic', card);

    expect(texto).toBe('');
  });
});
