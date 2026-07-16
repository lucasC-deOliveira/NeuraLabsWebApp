import { Injectable } from '@nestjs/common';
import { type TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GraphNodeRepository } from '../../domain/ports/graph-node-repository';
import { createContainedNode } from './node-containment';

@Injectable()
export class PrismaGraphNodeRepository implements GraphNodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async graphExists(grafoId: string, userId: string): Promise<boolean> {
    const g = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { id: true },
    });
    return g !== null;
  }

  async addNodeLink(
    grafoId: string,
    userId: string,
    tipoNode: string,
    entityId: string,
  ): Promise<void> {
    await createContainedNode(this.prisma, {
      usuarioId: userId,
      grafoId,
      tipoNode: tipoNode as TipoNode,
      referenciaId: entityId,
    });
  }

  async findNodeInGraph(
    grafoId: string,
    userId: string,
    refId: string,
  ): Promise<{ id: string } | null> {
    const node = await this.prisma.nodeConhecimento.findFirst({
      where: { referenciaId: refId, usuarioId: userId, contidoEm: { some: { grafoId } } },
      select: { id: true },
    });
    return node ? { id: node.id } : null;
  }

  async removeNodeLink(nodeId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.conhecimentoAresta.deleteMany({
        where: { OR: [{ nodeOrigemId: nodeId }, { nodeDestinoId: nodeId }] },
      });
      await tx.desempenhoNo.deleteMany({ where: { nodeId } });
      await tx.nodeConhecimento.delete({ where: { id: nodeId } });
    });
  }
}
