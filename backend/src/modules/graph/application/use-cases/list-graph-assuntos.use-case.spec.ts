import { describe, it, expect } from 'vitest';
import { ListGraphAssuntosUseCase } from './list-graph-assuntos.use-case';
import type { GraphAssunto, GraphQuery } from '../../domain/ports/graph-query';

class FakeGraphQuery implements GraphQuery {
  constructor(private readonly assuntos: GraphAssunto[]) {}
  async listForUser(): Promise<never> {
    throw new Error('not used');
  }
  async findInfo(): Promise<null> {
    return null;
  }
  async listAssuntos(): Promise<GraphAssunto[]> {
    return this.assuntos;
  }
}

describe('ListGraphAssuntosUseCase', () => {
  it('returns the distinct assuntos for the user', async () => {
    const useCase = new ListGraphAssuntosUseCase(
      new FakeGraphQuery([
        { id: 'a1', nome: 'Direito', peso: 0 },
        { id: 'a2', nome: 'Português', peso: 0 },
      ]),
    );
    const res = await useCase.execute('u1');
    expect(res.map((a) => a.nome)).toEqual(['Direito', 'Português']);
  });
});
