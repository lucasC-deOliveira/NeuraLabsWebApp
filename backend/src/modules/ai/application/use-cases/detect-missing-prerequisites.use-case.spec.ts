import { describe, it, expect } from 'vitest';
import { DetectMissingPrerequisitesUseCase } from './detect-missing-prerequisites.use-case';
import type { PrerequisiteNodesRepository } from '../../domain/ports/prerequisite-nodes-repository';
import type { PrereqNode } from '../../domain/services/missing-prerequisites';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeRepo implements PrerequisiteNodesRepository {
  constructor(private readonly nodes: PrereqNode[]) {}
  async loadNodes(): Promise<PrereqNode[]> {
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

const nodes: PrereqNode[] = [{ id: 'c1', tipo: 'CONCEITO', nome: 'Recursão' }];

describe('DetectMissingPrerequisitesUseCase', () => {
  it('returns nothing for an empty graph', async () => {
    const llm = new FakeLlm('{"prerequisites":[{"nome":"X"}]}');
    const useCase = new DetectMissingPrerequisitesUseCase(new FakeRepo([]), llm);
    expect(await useCase.execute('u1', 'g1')).toEqual({ prerequisites: [] });
    expect(llm.lastRequest).toBeNull();
  });

  it('resolves the model suggestions against existing nodes', async () => {
    const llm = new FakeLlm(
      '{"prerequisites":[{"nome":"Lógica","motivo":"base","shouldConnectTo":[{"nome":"Recursão"}]}]}',
    );
    const useCase = new DetectMissingPrerequisitesUseCase(new FakeRepo(nodes), llm);
    const res = await useCase.execute('u1', 'g1');
    expect(res.prerequisites).toEqual([
      {
        nome: 'Lógica',
        tipo: 'CONCEITO',
        motivo: 'base',
        shouldConnectTo: [{ id: 'c1', nome: 'Recursão' }],
      },
    ]);
  });

  it('returns nothing when the model output is invalid JSON', async () => {
    const useCase = new DetectMissingPrerequisitesUseCase(new FakeRepo(nodes), new FakeLlm('nope'));
    expect(await useCase.execute('u1', 'g1')).toEqual({ prerequisites: [] });
  });
});
