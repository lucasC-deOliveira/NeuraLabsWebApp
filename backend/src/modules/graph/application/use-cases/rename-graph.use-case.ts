import type { GraphRepository } from '../../domain/ports/graph-repository';
import type { CachePort } from '../../../cache/domain/cache-port';

/**
 * Renames a knowledge graph (the root subject's name mirrors it in the adapter).
 * @example renameGraph.execute('u1', 'g1', '  Physics  ') // → { success: true }
 */
export class RenameGraphUseCase {
  constructor(
    private readonly graphs: GraphRepository,
    private readonly cache: CachePort,
  ) {}

  async execute(userId: string, grafoId: string, nome: string): Promise<{ success: boolean }> {
    await this.graphs.rename(userId, grafoId, nome.trim());
    // O nome mudou → a listagem cacheada desse usuário some.
    await this.cache.delByTag(`user:${userId}`);
    return { success: true };
  }
}
