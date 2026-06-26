import { describe, it, expect } from 'vitest';
import { GetNodeDetailsUseCase } from './get-node-details.use-case';
import type { NodeDetails, NodeDetailsQuery } from '../../domain/ports/node-details-query';

class FakeNodeDetailsQuery implements NodeDetailsQuery {
  constructor(private readonly result: NodeDetails | null) {}
  async findDetails(): Promise<NodeDetails | null> {
    return this.result;
  }
}

describe('GetNodeDetailsUseCase', () => {
  it('returns the details for an owned node', async () => {
    const useCase = new GetNodeDetailsUseCase(new FakeNodeDetailsQuery({ nome: 'X' }));
    expect(await useCase.execute('u1', 'ASSUNTO', 'a1')).toEqual({ nome: 'X' });
  });

  it('returns null when the node is not found', async () => {
    const useCase = new GetNodeDetailsUseCase(new FakeNodeDetailsQuery(null));
    expect(await useCase.execute('u1', 'ASSUNTO', 'missing')).toBeNull();
  });
});
