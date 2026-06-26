import { Injectable } from '@nestjs/common';
import { type TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GraphNodeRepository } from '../../domain/ports/graph-node-repository';

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
    await this.prisma.nodeConhecimento.create({
      data: {
        grafoId,
        tipoNode: tipoNode as TipoNode,
        referenciaId: entityId,
        usuarioId: userId,
        nivelDominio: 0,
      },
    });
  }

  async isRootAssunto(userId: string, refId: string): Promise<boolean> {
    const root = await this.prisma.grafosConhecimento.findFirst({
      where: { rootAssuntoId: refId, usuarioId: userId },
      select: { id: true },
    });
    return root !== null;
  }

  async findNodeInGraph(
    grafoId: string,
    userId: string,
    refId: string,
  ): Promise<{ id: string } | null> {
    const node = await this.prisma.nodeConhecimento.findFirst({
      where: { referenciaId: refId, usuarioId: userId, grafoId },
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
