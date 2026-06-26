import { planPositionUpdates, type Point } from '../../domain/services/position-plan';
import type { GraphPositionRepository } from '../../domain/ports/graph-position-repository';

/**
 * Persists node positions for a graph. Keys are "prefix:id"; unprefixed or
 * unknown-prefix entries are ignored.
 * @example savePositions.execute('u1', 'g1', { 'conceito:c1': { x: 0, y: 0 } })
 */
export class SavePositionsUseCase {
  constructor(private readonly positions: GraphPositionRepository) {}

  async execute(
    userId: string,
    grafoId: string,
    positions: Record<string, Point>,
  ): Promise<{ success: boolean }> {
    await this.positions.applyPositions(userId, grafoId, planPositionUpdates(positions));
    return { success: true };
  }
}
