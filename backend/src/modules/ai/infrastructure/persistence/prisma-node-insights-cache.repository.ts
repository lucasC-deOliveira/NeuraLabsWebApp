import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NodeInsightsResult } from '../../domain/services/node-insights';
import type {
  CachedNodeInsights,
  NodeInsightsCacheRepository,
} from '../../domain/ports/node-insights-cache-repository';

@Injectable()
export class PrismaNodeInsightsCacheRepository implements NodeInsightsCacheRepository {
  constructor(private readonly prisma: PrismaService) {}

  async load(grafoId: string, nodeId: string): Promise<CachedNodeInsights | null> {
    const row = await this.prisma.nodeInsightsCache.findUnique({
      where: { _insights_unique: { grafoId, nodeId } },
      select: { assinatura: true, dados: true },
    });
    if (!row) return null;
    return { assinatura: row.assinatura, result: row.dados as unknown as NodeInsightsResult };
  }

  async save(
    userId: string,
    grafoId: string,
    nodeId: string,
    assinatura: string,
    result: NodeInsightsResult,
  ): Promise<void> {
    const dados = result as unknown as Prisma.InputJsonValue;
    await this.prisma.nodeInsightsCache.upsert({
      where: { _insights_unique: { grafoId, nodeId } },
      create: { usuarioId: userId, grafoId, nodeId, assinatura, dados },
      update: { assinatura, dados },
    });
  }
}
