import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  FeynmanAnalyticsSource,
  FeynmanRow,
} from '../../domain/ports/feynman-analytics-source';

// Read-model adapter: lê as explicações Feynman do usuário para os analytics.
@Injectable()
export class PrismaFeynmanAnalyticsSource implements FeynmanAnalyticsSource {
  constructor(private readonly prisma: PrismaService) {}

  async explicacoesSince(userId: string, since: Date): Promise<FeynmanRow[]> {
    const rows = await this.prisma.explicacaoFeynman.findMany({
      where: { usuarioId: userId, dataCriacao: { gte: since } },
      select: { dataCriacao: true, clareza: true, alvoTipo: true, alvoId: true },
    });
    return rows.map((r) => ({
      data: r.dataCriacao,
      clareza: r.clareza,
      alvoTipo: r.alvoTipo,
      alvoId: r.alvoId,
    }));
  }
}
