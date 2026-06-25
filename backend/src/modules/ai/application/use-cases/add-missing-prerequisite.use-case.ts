import { prerequisiteRelation } from '../../domain/services/prerequisite-relation';
import { tryCreateEdge } from '../graph-write-helpers';
import type { GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';
import type { NodeTypesRepository } from '../../domain/ports/node-types-repository';

/**
 * Adds a missing prerequisite node and links it to the given existing nodes with
 * the prerequisite relation appropriate for each target type.
 * @example addMissingPrerequisite.execute('u1', 'g1', 'Álgebra', 'CONCEITO', ['n1'])
 */
export class AddMissingPrerequisiteUseCase {
  constructor(
    private readonly nodeWriter: GraphNodeWriter,
    private readonly edgeWriter: GraphEdgeWriter,
    private readonly types: NodeTypesRepository,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    nome: string,
    tipo: string,
    connectToIds: string[],
  ): Promise<{ nodeId: string }> {
    const { nodeId } = await this.nodeWriter.createNode(userId, grafoId, {
      tipoNode: tipo,
      nome,
      descricao: '',
    });
    const typeByRefId = await this.types.loadNodeTypes(userId, grafoId, connectToIds);
    for (const targetId of connectToIds) {
      await this.connect(userId, grafoId, nodeId, tipo, targetId, typeByRefId);
    }
    return { nodeId };
  }

  private async connect(
    userId: string,
    grafoId: string,
    sourceNodeId: string,
    sourceTipo: string,
    targetId: string,
    typeByRefId: Map<string, string>,
  ): Promise<void> {
    const targetType = typeByRefId.get(targetId);
    if (!targetType) return;
    const tipoRelacao = prerequisiteRelation(sourceTipo, targetType);
    if (!tipoRelacao) return;
    await tryCreateEdge(this.edgeWriter, userId, grafoId, {
      sourceNodeId,
      targetNodeId: targetId,
      tipoRelacao,
    });
  }
}
