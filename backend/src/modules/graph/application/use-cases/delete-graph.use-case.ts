import { GraphNotFoundError } from '../../domain/errors';
import type { GraphDeletionRepository } from '../../domain/ports/graph-deletion-repository';
import type { CachePort } from '../../../cache/domain/cache-port';

/**
 * Apaga um grafo — a VISTA, não o conteúdo. Os nós pertencem ao sistema; o grafo
 * só os contém, então apagá-lo remove a contenção (o layout e o vínculo) e nada
 * mais. Um card classificado não pode sumir porque uma vista dele foi apagada.
 *
 * Antes isto apagava as entidades: montava a lista de membros, tirava as que
 * estavam em outro grafo (`existsInOtherGraph`), respeitava um `keepTypes` vindo
 * da tela e apagava o resto. Com o nó do sistema esse mecanismo perdeu a razão de
 * existir. Para apagar uma entidade existe o DeleteNodeUseCase.
 * @example deleteGraph.execute('u1', 'g1')
 */
export class DeleteGraphUseCase {
  constructor(
    private readonly graphs: GraphDeletionRepository,
    private readonly cache: CachePort,
  ) {}

  async execute(userId: string, grafoId: string): Promise<{ success: boolean }> {
    if (!(await this.graphs.graphExists(grafoId, userId))) throw new GraphNotFoundError();
    await this.graphs.deleteGraph(grafoId);
    // Uma vista a menos → a listagem cacheada desse usuário some.
    await this.cache.delByTag(`user:${userId}`);
    return { success: true };
  }
}
