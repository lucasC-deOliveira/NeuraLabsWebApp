import { describe, it, expect, beforeEach } from 'vitest';
import { DeleteGraphUseCase } from './delete-graph.use-case';
import { GraphNotFoundError } from '../../domain/errors';
import type {
  GraphDeletionExecution,
  GraphDeletionRepository,
} from '../../domain/ports/graph-deletion-repository';
import type { GraphMember } from '../../domain/services/graph-deletion-plan';

class FakeGraphDeletionRepository implements GraphDeletionRepository {
  readonly graphs = new Set<string>();
  members: GraphMember[] = [];
  // Entities present in another graph (by referenciaId).
  readonly sharedRefs = new Set<string>();
  executed: GraphDeletionExecution | null = null;

  async graphExists(grafoId: string): Promise<boolean> {
    return this.graphs.has(grafoId);
  }
  async listMembers(): Promise<GraphMember[]> {
    return this.members;
  }
  async existsInOtherGraph(_u: string, _t: string, referenciaId: string): Promise<boolean> {
    return this.sharedRefs.has(referenciaId);
  }
  async deleteGraph(_u: string, _g: string, plan: GraphDeletionExecution): Promise<void> {
    this.executed = plan;
  }
}

describe('DeleteGraphUseCase', () => {
  let repo: FakeGraphDeletionRepository;
  let useCase: DeleteGraphUseCase;

  beforeEach(() => {
    repo = new FakeGraphDeletionRepository();
    repo.graphs.add('g1');
    useCase = new DeleteGraphUseCase(repo);
  });

  it('throws when the graph does not exist', async () => {
    await expect(useCase.execute('u1', 'missing', [])).rejects.toBeInstanceOf(GraphNotFoundError);
  });

  it('deletes owned structural entities in dependency order', async () => {
    repo.members = [
      { tipoNode: 'ASSUNTO', referenciaId: 'a' },
      { tipoNode: 'CONCEITO', referenciaId: 'c' },
    ];
    const res = await useCase.execute('u1', 'g1', []);
    expect(res).toEqual({ success: true });
    expect(repo.executed?.ordered.map((m) => m.tipoNode)).toEqual(['CONCEITO', 'ASSUNTO']);
  });

  it('excludes entities shared with another graph', async () => {
    repo.members = [
      { tipoNode: 'CONCEITO', referenciaId: 'shared' },
      { tipoNode: 'CONCEITO', referenciaId: 'own' },
    ];
    repo.sharedRefs.add('shared');
    await useCase.execute('u1', 'g1', []);
    expect(repo.executed?.ordered.map((m) => m.referenciaId)).toEqual(['own']);
  });

  it('detaches kept flashcards from concepts being deleted', async () => {
    repo.members = [{ tipoNode: 'CONCEITO', referenciaId: 'c1' }];
    await useCase.execute('u1', 'g1', ['FLASHCARD']);
    expect(repo.executed?.detachConceptIds).toEqual(['c1']);
  });
});
