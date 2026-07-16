import { describe, it, expect, beforeEach } from 'vitest';
import { DeleteGraphUseCase } from './delete-graph.use-case';
import { GraphNotFoundError } from '../../domain/errors';
import type { GraphDeletionRepository } from '../../domain/ports/graph-deletion-repository';

class FakeGraphDeletionRepository implements GraphDeletionRepository {
  readonly graphs = new Set<string>();
  readonly deletados: string[] = [];

  async graphExists(grafoId: string): Promise<boolean> {
    return this.graphs.has(grafoId);
  }
  async deleteGraph(grafoId: string): Promise<void> {
    this.deletados.push(grafoId);
  }
}

// Apagar um grafo apaga a VISTA. Este spec era três vezes maior: montava membros,
// refs compartilhadas e um plano ordenado de deleção de entidades, porque o grafo
// levava o conteúdo junto. Com o nó do sistema, sobrou o que a operação de fato é.
describe('DeleteGraphUseCase', () => {
  let repo: FakeGraphDeletionRepository;
  let useCase: DeleteGraphUseCase;

  beforeEach(() => {
    repo = new FakeGraphDeletionRepository();
    repo.graphs.add('g1');
    useCase = new DeleteGraphUseCase(repo);
  });

  it('deletes the graph the user owns', async () => {
    expect(await useCase.execute('u1', 'g1')).toEqual({ success: true });
    expect(repo.deletados).toEqual(['g1']);
  });

  it('refuses a graph that does not exist, instead of deleting nothing quietly', async () => {
    await expect(useCase.execute('u1', 'inexistente')).rejects.toThrow(GraphNotFoundError);
    expect(repo.deletados).toEqual([]);
  });
});
