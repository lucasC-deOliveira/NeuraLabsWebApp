import { Injectable } from '@nestjs/common';
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

  loadView(userId: string, grafoId: string): Promise<GraphView> {
    return buildKnowledgeGraph(this.prisma, userId, grafoId);
  }
}
