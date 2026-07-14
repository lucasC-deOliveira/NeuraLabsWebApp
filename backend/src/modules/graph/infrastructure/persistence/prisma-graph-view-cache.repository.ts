import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GraphView } from '../../domain/ports/graph-view-repository';
import type {
  CachedGraphView,
  GraphViewCacheRepository,
} from '../../domain/ports/graph-view-cache-repository';

const ms = (d: Date | null | undefined): number => d?.getTime() ?? 0;

@Injectable()
export class PrismaGraphViewCacheRepository implements GraphViewCacheRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Signature from cheap aggregates: node/edge counts + their max timestamps +
  // the graph's own updatedAt. Any structural change, position/domain update,
  // edge edit or rename changes it — invalidating the cache without a rebuild.
  async currentSignature(userId: string, grafoId: string): Promise<string> {
    const [nodes, edges, grafo] = await Promise.all([
      this.prisma.nodeConhecimento.aggregate({
        where: { grafoId, usuarioId: userId },
        _count: true,
        _max: { ultimaAtualizacao: true },
      }),
      this.prisma.conhecimentoAresta.aggregate({
        where: { grafoId },
        _count: true,
        _max: { ultimaAtualizacao: true },
      }),
      this.prisma.grafosConhecimento.findFirst({
        where: { id: grafoId, usuarioId: userId },
        select: { dataAtualizacao: true },
      }),
    ]);
    return `${nodes._count}:${ms(nodes._max.ultimaAtualizacao)}:${edges._count}:${ms(edges._max.ultimaAtualizacao)}:${ms(grafo?.dataAtualizacao)}`;
  }

  async load(grafoId: string): Promise<CachedGraphView | null> {
    const row = await this.prisma.graphViewCache.findUnique({
      where: { grafoId },
      select: { assinatura: true, dados: true },
    });
    if (!row) return null;
    return { assinatura: row.assinatura, view: row.dados as unknown as GraphView };
  }

  async save(userId: string, grafoId: string, assinatura: string, view: GraphView): Promise<void> {
    const dados = view as unknown as Prisma.InputJsonValue;
    await this.prisma.graphViewCache.upsert({
      where: { grafoId },
      create: { usuarioId: userId, grafoId, assinatura, dados },
      update: { assinatura, dados },
    });
  }
}
