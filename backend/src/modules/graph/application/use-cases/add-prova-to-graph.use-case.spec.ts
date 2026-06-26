import { describe, it, expect, beforeEach } from 'vitest';
import { AddProvaToGraphUseCase } from './add-prova-to-graph.use-case';
import { GraphNotFoundError, ProvaNotFoundError } from '../../domain/errors';
import type { AddProvaRepository } from '../../domain/ports/add-prova-repository';

class FakeAddProvaRepository implements AddProvaRepository {
  graphs = new Set<string>();
  provas = new Set<string>();
  linked = false;
  async graphExists(grafoId: string): Promise<boolean> {
    return this.graphs.has(grafoId);
  }
  async provaExists(provaId: string): Promise<boolean> {
    return this.provas.has(provaId);
  }
  async linkProva(): Promise<string> {
    this.linked = true;
    return 'node-1';
  }
}

describe('AddProvaToGraphUseCase', () => {
  let repo: FakeAddProvaRepository;
  let useCase: AddProvaToGraphUseCase;

  beforeEach(() => {
    repo = new FakeAddProvaRepository();
    repo.graphs.add('g1');
    repo.provas.add('p1');
    useCase = new AddProvaToGraphUseCase(repo);
  });

  it('links an owned exam into the graph', async () => {
    expect(await useCase.execute('u1', 'g1', 'p1')).toEqual({ success: true, nodeId: 'node-1' });
  });

  it('throws when the graph does not exist', async () => {
    await expect(useCase.execute('u1', 'missing', 'p1')).rejects.toBeInstanceOf(GraphNotFoundError);
  });

  it('throws when the exam is not found', async () => {
    await expect(useCase.execute('u1', 'g1', 'missing')).rejects.toBeInstanceOf(ProvaNotFoundError);
    expect(repo.linked).toBe(false);
  });
});
