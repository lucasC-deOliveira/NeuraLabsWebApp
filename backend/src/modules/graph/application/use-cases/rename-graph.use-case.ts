import type { GraphRepository } from '../../domain/ports/graph-repository';

/**
 * Renames a knowledge graph (the root subject's name mirrors it in the adapter).
 * @example renameGraph.execute('u1', 'g1', '  Physics  ') // → { success: true }
 */
export class RenameGraphUseCase {
  constructor(private readonly graphs: GraphRepository) {}

  async execute(userId: string, grafoId: string, nome: string): Promise<{ success: boolean }> {
    await this.graphs.rename(userId, grafoId, nome.trim());
    return { success: true };
  }
}
