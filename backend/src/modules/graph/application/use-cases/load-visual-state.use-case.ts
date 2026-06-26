import type { GraphVisualStateRepository } from '../../domain/ports/graph-visual-state-repository';

/**
 * Loads a graph's visual state, parsing the stored JSON. Returns null when none
 * is set, the graph is not owned, or the stored value is not valid JSON.
 * @example loadVisualState.execute('u1', 'g1') // → parsed state | null
 */
export class LoadVisualStateUseCase {
  constructor(private readonly visualState: GraphVisualStateRepository) {}

  async execute(userId: string, grafoId: string): Promise<unknown> {
    const raw = await this.visualState.loadRaw(userId, grafoId);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
