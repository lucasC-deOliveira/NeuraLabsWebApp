import { describe, it, expect, beforeEach } from 'vitest';
import { UpdateNodeUseCase } from './update-node.use-case';
import { NodeNotInGraphError, NodeValidationError } from '../../domain/errors';
import type { NodeUpdateData } from '../../domain/services/node-update';
import type { NodeUpdateRepository } from '../../domain/ports/node-update-repository';

class FakeNodeUpdateRepository implements NodeUpdateRepository {
  updatedCount = 1;
  lastCall: { tipoNode: string; refId: string; data: NodeUpdateData } | null = null;
  async updateNode(
    _userId: string,
    tipoNode: string,
    refId: string,
    data: NodeUpdateData,
  ): Promise<{ updated: number }> {
    this.lastCall = { tipoNode, refId, data };
    return { updated: this.updatedCount };
  }
}

describe('UpdateNodeUseCase', () => {
  let repo: FakeNodeUpdateRepository;
  let useCase: UpdateNodeUseCase;

  beforeEach(() => {
    repo = new FakeNodeUpdateRepository();
    useCase = new UpdateNodeUseCase(repo);
  });

  it('updates an editable node', async () => {
    const res = await useCase.execute('u1', 'CONCEITO', 'c1', { nome: 'New' });
    expect(res).toEqual({ success: true });
    expect(repo.lastCall).toEqual({ tipoNode: 'CONCEITO', refId: 'c1', data: { nome: 'New' } });
  });

  it('throws when nothing matched', async () => {
    repo.updatedCount = 0;
    await expect(useCase.execute('u1', 'CONCEITO', 'missing', {})).rejects.toBeInstanceOf(
      NodeNotInGraphError,
    );
  });

  it('rejects an invalid note subtype before persisting', async () => {
    await expect(useCase.execute('u1', 'NOTA', 'n1', { subtipo: 'NOPE' })).rejects.toBeInstanceOf(
      NodeValidationError,
    );
    expect(repo.lastCall).toBeNull();
  });
});
