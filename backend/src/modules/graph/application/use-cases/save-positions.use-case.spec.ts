import { describe, it, expect } from 'vitest';
import { SavePositionsUseCase } from './save-positions.use-case';
import type { GraphPositionRepository } from '../../domain/ports/graph-position-repository';
import type { PositionUpdate } from '../../domain/services/position-plan';

class FakeGraphPositionRepository implements GraphPositionRepository {
  applied: PositionUpdate[] | null = null;
  async applyPositions(
    _userId: string,
    _grafoId: string,
    updates: PositionUpdate[],
  ): Promise<void> {
    this.applied = updates;
  }
}

describe('SavePositionsUseCase', () => {
  it('plans the updates and applies them', async () => {
    const repo = new FakeGraphPositionRepository();
    const res = await new SavePositionsUseCase(repo).execute('u1', 'g1', {
      'conceito:c1': { x: 5, y: 6 },
      plainId: { x: 9, y: 9 },
    });
    expect(res).toEqual({ success: true });
    expect(repo.applied).toEqual([{ tipoNode: 'CONCEITO', referenciaId: 'c1', x: 5, y: 6 }]);
  });
});
