import { describe, it, expect } from 'vitest';
import { DetectDuplicatesUseCase } from './detect-duplicates.use-case';
import type {
  DuplicateGraphNode,
  DuplicateNodesRepository,
} from '../../domain/ports/duplicate-nodes-repository';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeNodes implements DuplicateNodesRepository {
  constructor(private readonly nodes: DuplicateGraphNode[]) {}
  async loadGraphNodes(): Promise<DuplicateGraphNode[]> {
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

const node = (id: string, tipo: string): DuplicateGraphNode => ({
  id,
  tipo,
  nome: `n-${id}`,
  desc: '',
});

describe('DetectDuplicatesUseCase', () => {
  it('returns no groups when there are fewer than two nodes', async () => {
    const llm = new FakeLlm('{"groups":[{"indices":[0,1]}]}');
    const useCase = new DetectDuplicatesUseCase(new FakeNodes([node('a', 'CONCEITO')]), llm);
    expect(await useCase.execute('u1', 'g1')).toEqual({ groups: [] });
    expect(llm.lastRequest).toBeNull();
  });

  it('resolves and validates the model groups', async () => {
    const nodes = [node('a', 'CONCEITO'), node('b', 'CONCEITO'), node('c', 'TOPICO')];
    const llm = new FakeLlm(
      '{"groups":[{"indices":[0,1],"sugestao":"manter [0]"},{"indices":[0,2]}]}',
    );
    const useCase = new DetectDuplicatesUseCase(new FakeNodes(nodes), llm);
    const res = await useCase.execute('u1', 'g1');
    expect(res.groups).toHaveLength(1);
    expect(res.groups[0]?.nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(llm.lastRequest?.maxTokens).toBe(6000);
  });
});
