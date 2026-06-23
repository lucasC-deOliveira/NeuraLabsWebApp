import { EdgeWeight } from '../../domain/value-objects/edge-weight';
import { EdgeNotFoundError } from '../../domain/errors';
import type { GraphEdgeRepository } from '../../domain/ports/graph-edge-repository';

export interface UpdateEdgeCommand {
  userId: string;
  grafoId: string;
  edgeId: string;
  tipoRelacao?: string;
  peso?: number;
}

/**
 * Updates a relation's type and/or weight. Throws when the edge is not owned.
 * @example useCase.execute({ userId, grafoId, edgeId, peso: 1.5 })
 */
export class UpdateEdgeUseCase {
  constructor(private readonly edges: GraphEdgeRepository) {}

  async execute(cmd: UpdateEdgeCommand): Promise<{ success: boolean }> {
    if (cmd.peso !== undefined) EdgeWeight.create(cmd.peso);

    const edge = await this.edges.findOwnedEdge(cmd.grafoId, cmd.edgeId, cmd.userId);
    if (!edge) throw new EdgeNotFoundError(cmd.edgeId);

    await this.edges.updateEdge(cmd.edgeId, { tipoRelacao: cmd.tipoRelacao, peso: cmd.peso });
    return { success: true };
  }
}
