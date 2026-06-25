import { describe, it, expect } from 'vitest';
import { GenerateCommunitySummaryUseCase } from './generate-community-summary.use-case';
import { EmptyClusterContentError, EmptyNodeListError } from '../../domain/errors';
import type { ClusterNodesRepository } from '../../domain/ports/cluster-nodes-repository';
import type { ClusterNode } from '../../domain/services/cluster-context';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeRepo implements ClusterNodesRepository {
  constructor(private readonly nodes: ClusterNode[]) {}
  async loadClusterContent(): Promise<ClusterNode[]> {
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

describe('GenerateCommunitySummaryUseCase', () => {
  it('rejects an empty node list', async () => {
    const useCase = new GenerateCommunitySummaryUseCase(new FakeRepo([]), new FakeLlm('{}'));
    await expect(useCase.execute('u1', 'g1', [])).rejects.toBeInstanceOf(EmptyNodeListError);
  });

  it('rejects when the given ids resolve to no nodes (empty context)', async () => {
    const useCase = new GenerateCommunitySummaryUseCase(new FakeRepo([]), new FakeLlm('{}'));
    await expect(useCase.execute('u1', 'g1', ['ghost'])).rejects.toBeInstanceOf(
      EmptyClusterContentError,
    );
  });

  it('returns the parsed summary', async () => {
    const nodes: ClusterNode[] = [{ tipo: 'CONCEITO', nome: 'Mitose', corpo: 'divisão' }];
    const llm = new FakeLlm('{"titulo":"Divisão celular","resumo":"# Resumo"}');
    const useCase = new GenerateCommunitySummaryUseCase(new FakeRepo(nodes), llm);
    expect(await useCase.execute('u1', 'g1', ['c1'])).toEqual({
      titulo: 'Divisão celular',
      resumo: '# Resumo',
    });
  });
});
