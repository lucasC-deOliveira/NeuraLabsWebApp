import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  LearningEdge,
  LearningGraph,
  LearningGraphRepository,
} from '../../domain/ports/learning-graph-repository';
import { loadStructuralNodes } from './structural-nodes';

@Injectable()
export class PrismaLearningGraphRepository implements LearningGraphRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadLearningGraph(userId: string, grafoId: string): Promise<LearningGraph> {
    const structural = await loadStructuralNodes(this.prisma, userId, grafoId);
    const nodes = structural.map((n) => ({ id: n.id, nome: n.nome, tipo: n.tipo }));
    return { nodes, edges: await this.loadEdges(userId, grafoId) };
  }

  // Resolves edge endpoints (node link ids) to entity referenciaIds.
  private async loadEdges(userId: string, grafoId: string): Promise<LearningEdge[]> {
    const [rawEdges, ncNodes] = await Promise.all([
      this.prisma.conhecimentoAresta.findMany({
        where: { grafoId },
        select: { nodeOrigemId: true, nodeDestinoId: true, tipoRelacao: true },
      }),
      this.prisma.nodeConhecimento.findMany({
        where: { usuarioId: userId, contidoEm: { some: { grafoId } } },
        select: { id: true, referenciaId: true },
      }),
    ]);
    const refById = new Map(ncNodes.map((n) => [n.id, n.referenciaId]));
    return rawEdges
      .filter((e) => e.nodeOrigemId && e.nodeDestinoId)
      .map((e) => ({
        origem: refById.get(e.nodeOrigemId ?? '') ?? '',
        destino: refById.get(e.nodeDestinoId ?? '') ?? '',
        relacao: e.tipoRelacao,
      }));
  }
}
