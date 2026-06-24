import type { GraphVisualStateRepository } from '../../domain/ports/graph-visual-state-repository';

/**
 * Persists a graph's visual state (serialized as JSON). No-op when not owned.
 * @example saveVisualState.execute('u1', 'g1', { zoom: 1 })
 */
export class SaveVisualStateUseCase {
  constructor(private readonly visualState: GraphVisualStateRepository) {}

  async execute(userId: string, grafoId: string, state: unknown): Promise<{ success: boolean }> {
    await this.visualState.save(userId, grafoId, JSON.stringify(state));
    return { success: true };
  }
}
