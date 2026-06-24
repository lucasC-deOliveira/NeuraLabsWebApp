import { describe, it, expect, beforeEach } from 'vitest';
import { CreateNodeUseCase } from './create-node.use-case';
import { GraphNotFoundError, NodeValidationError } from '../../domain/errors';
import type { CreateNodeInput } from '../../domain/services/node-creation';
import type { NodeCreationRepository } from '../../domain/ports/node-creation-repository';

class FakeNodeCreationRepository implements NodeCreationRepository {
  readonly graphs = new Set<string>();
  created: { input: CreateNodeInput } | null = null;
  async graphExists(grafoId: string): Promise<boolean> {
    return this.graphs.has(grafoId);
  }
  async createNode(_u: string, _g: string, input: CreateNodeInput): Promise<{ nodeId: string }> {
    this.created = { input };
    return { nodeId: 'entity-1' };
  }
}

describe('CreateNodeUseCase', () => {
  let repo: FakeNodeCreationRepository;
  let useCase: CreateNodeUseCase;

  beforeEach(() => {
    repo = new FakeNodeCreationRepository();
    repo.graphs.add('g1');
    useCase = new CreateNodeUseCase(repo);
  });

  it('creates the node when the graph exists and the input is valid', async () => {
    const res = await useCase.execute('u1', 'g1', { tipoNode: 'CONCEITO', nome: 'Mitose' });
    expect(res).toEqual({ nodeId: 'entity-1' });
    expect(repo.created?.input.nome).toBe('Mitose');
  });

  it('throws when the graph does not exist', async () => {
    await expect(useCase.execute('u1', 'missing', { tipoNode: 'CONCEITO' })).rejects.toBeInstanceOf(
      GraphNotFoundError,
    );
    expect(repo.created).toBeNull();
  });

  it('validates the input before persisting', async () => {
    await expect(
      useCase.execute('u1', 'g1', { tipoNode: 'NOTA', titulo: '' }),
    ).rejects.toBeInstanceOf(NodeValidationError);
    expect(repo.created).toBeNull();
  });
});
