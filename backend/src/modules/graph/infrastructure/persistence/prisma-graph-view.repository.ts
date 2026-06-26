import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { buildKnowledgeGraph } from '../../../../graph/knowledge-graph';
import type { GraphView, GraphViewRepository } from '../../domain/ports/graph-view-repository';

@Injectable()
export class PrismaGraphViewRepository implements GraphViewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async exists(grafoId: string, userId: string): Promise<boolean> {
    const g = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { id: true },
    });
    return g !== null;
  }

  // Lazily creates the graph's root subject (ASSUNTO at 0,0) for graphs created
  // before that feature. Idempotent: only acts when rootAssuntoId is null.
  async ensureRoot(userId: string, grafoId: string): Promise<void> {
    const g = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { id: true, nome: true, rootAssuntoId: true },
    });
    if (!g || g.rootAssuntoId) return;
    await this.prisma.$transaction((tx) => this.createRoot(tx, userId, grafoId, g.nome));
  }

  private async createRoot(
    tx: Prisma.TransactionClient,
    userId: string,
    grafoId: string,
    nome: string,
  ): Promise<void> {
    const root = await tx.assunto.create({ data: { nome, usuarioId: userId } });
    await this.linkRootNode(tx, userId, grafoId, root.id);
    await tx.grafosConhecimento.update({
      where: { id: grafoId },
      data: { rootAssuntoId: root.id },
    });
  }

  private linkRootNode(
    tx: Prisma.TransactionClient,
    userId: string,
    grafoId: string,
    rootId: string,
  ): Promise<unknown> {
    return tx.nodeConhecimento.create({
      data: {
        usuarioId: userId,
        grafoId,
        tipoNode: 'ASSUNTO',
        referenciaId: rootId,
        posicaoX: 0,
        posicaoY: 0,
      },
    });
  }

  loadView(userId: string, grafoId: string): Promise<GraphView> {
    return buildKnowledgeGraph(this.prisma, userId, grafoId);
  }
}
