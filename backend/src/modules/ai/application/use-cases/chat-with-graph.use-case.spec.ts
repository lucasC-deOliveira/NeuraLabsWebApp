import { describe, it, expect } from 'vitest';
import { ChatWithGraphUseCase } from './chat-with-graph.use-case';
import type { ChatNodesRepository } from '../../domain/ports/chat-nodes-repository';
import type { ChatContextNode } from '../../domain/services/chat-context';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeRepo implements ChatNodesRepository {
  constructor(private readonly nodes: ChatContextNode[]) {}
  async loadChatNodes(): Promise<ChatContextNode[]> {
    return this.nodes;
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

const nodes: ChatContextNode[] = [
  { id: 'c1', tipo: 'CONCEITO', nome: 'Mitose', corpo: 'divisão' },
  { id: 'n1', tipo: 'NOTA', nome: 'Nota', corpo: 'texto' },
];

describe('ChatWithGraphUseCase', () => {
  it('answers and resolves referenced nodes (only TOPICO/CONCEITO)', async () => {
    const llm = new FakeLlm('Resposta.\n{"referencedNodeIds":["c1","n1"]}');
    const useCase = new ChatWithGraphUseCase(new FakeRepo(nodes), llm);
    const res = await useCase.execute('u1', 'g1', 'O que é mitose?', []);
    expect(res.answer).toBe('Resposta.');
    expect(res.referencedNodes).toEqual([{ id: 'c1', nome: 'Mitose', tipo: 'CONCEITO' }]);
  });

  it('includes the recent history (capped) between system and the question', async () => {
    const llm = new FakeLlm('ok');
    const useCase = new ChatWithGraphUseCase(new FakeRepo(nodes), llm);
    const history = Array.from({ length: 8 }, (_, i) => ({
      role: 'user' as const,
      content: `h${i}`,
    }));
    await useCase.execute('u1', 'g1', 'pergunta', history);
    const sent = llm.lastRequest?.messages ?? [];
    expect(sent[0]?.role).toBe('system');
    expect(sent).toHaveLength(1 + 6 + 1);
    expect(sent[sent.length - 1]).toEqual({ role: 'user', content: 'pergunta' });
  });
});
