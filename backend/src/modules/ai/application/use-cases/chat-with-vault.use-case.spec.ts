import { expect, it } from 'vitest';
import type { VaultChatRequest } from '../../../../../../contracts/vault-chat';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';
import { ChatWithVaultUseCase } from './chat-with-vault.use-case';

class FakeVaultChatLlm implements LlmPort {
  request: LlmRequest | null = null;

  constructor(private readonly response: string) {}

  async complete(request: LlmRequest): Promise<string> {
    this.request = request;
    return this.response;
  }
}

const question: VaultChatRequest = {
  question: 'What is spaced repetition?',
  history: [],
  sources: [
    { id: 'n1', nome: 'Spaced repetition', tipo: 'NOTA', excerpt: 'Reviews use spaced intervals.' },
  ],
};

it('passes excerpts as data and accepts citations only from the submitted source IDs', async () => {
  const llm = new FakeVaultChatLlm(
    '{"answer":"Review at intervals.","referencedNodeIds":["n1","x","n1"]}',
  );
  const result = await new ChatWithVaultUseCase(llm).execute('account', question);
  expect(llm.request?.userId).toBe('account');
  expect(llm.request?.messages.at(-1)).toEqual({
    role: 'user',
    content: JSON.stringify({ question: question.question, sources: question.sources }),
  });
  expect(result).toEqual({
    answer: 'Review at intervals.',
    referencedNodes: [{ id: 'n1', nome: 'Spaced repetition', tipo: 'NOTA' }],
  });
});

it('returns no generated answer when the provider breaks the JSON contract', async () => {
  const llm = new FakeVaultChatLlm('invalid');
  await expect(new ChatWithVaultUseCase(llm).execute('account', question)).resolves.toEqual({
    answer: '',
    referencedNodes: [],
  });
});
