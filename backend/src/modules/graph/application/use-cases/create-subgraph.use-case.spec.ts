import { describe, it, expect, beforeEach } from 'vitest';
import { CreateSubgraphUseCase } from './create-subgraph.use-case';
import { InvalidSubgraphRelationError, ParentGraphNotFoundError } from '../../domain/errors';
import type {
  CreateSubgraphInput,
  CreateSubgraphRepository,
} from '../../domain/ports/create-subgraph-repository';

class FakeCreateSubgraphRepository implements CreateSubgraphRepository {
  parents = new Set<string>();
  created: CreateSubgraphInput | null = null;
  async parentExists(parentGrafoId: string): Promise<boolean> {
    return this.parents.has(parentGrafoId);
  }
  async createSubgraph(
    _u: string,
    _p: string,
    input: CreateSubgraphInput,
  ): Promise<{ grafoId: string; grafoRefNodeId: string }> {
    this.created = input;
    return { grafoId: 'child-1', grafoRefNodeId: 'child-1' };
  }
}

describe('CreateSubgraphUseCase', () => {
  let repo: FakeCreateSubgraphRepository;
  let useCase: CreateSubgraphUseCase;

  beforeEach(() => {
    repo = new FakeCreateSubgraphRepository();
    repo.parents.add('parent');
    useCase = new CreateSubgraphUseCase(repo);
  });

  it('creates the subgraph for a valid relation', async () => {
    const res = await useCase.execute('u1', 'parent', { nome: 'Sub', tipoRelacao: 'APROFUNDA' });
    expect(res).toEqual({ grafoId: 'child-1', grafoRefNodeId: 'child-1' });
    expect(repo.created?.tipoRelacao).toBe('APROFUNDA');
  });

  it('throws when the parent graph is missing', async () => {
    await expect(
      useCase.execute('u1', 'missing', { nome: 'Sub', tipoRelacao: 'APROFUNDA' }),
    ).rejects.toBeInstanceOf(ParentGraphNotFoundError);
  });

  it('throws on an invalid relation', async () => {
    await expect(
      useCase.execute('u1', 'parent', { nome: 'Sub', tipoRelacao: 'CONTEM' }),
    ).rejects.toBeInstanceOf(InvalidSubgraphRelationError);
    expect(repo.created).toBeNull();
  });
});
