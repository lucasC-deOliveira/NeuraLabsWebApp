import { Injectable } from '@nestjs/common';
import { TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { PlanContext, PlanContextQuery } from '../../domain/ports/plan-context-query';

// Estimativa fixa por card no v1 (o histórico tem tempo por revisão, mas a unidade
// varia entre importações; usar do histórico fica para um passo futuro).
const DEFAULT_SECONDS_PER_CARD = 20;

interface TrilhaStep {
  nodeId: string;
}

/**
 * Números do dia do plano. v1: backlog GLOBAL (a memória é global — o recorte por
 * grafo do plano é sobre os NOVOS, via roadmap); "restantes" = conceitos da trilha
 * ainda sem desempenho (nunca estudados).
 * @example ctx.load('u1', 'g1', 'prova')
 */
@Injectable()
export class PrismaPlanContextQuery implements PlanContextQuery {
  constructor(private readonly prisma: PrismaService) {}

  async load(userId: string, grafoId: string, prioridade: string): Promise<PlanContext> {
    const now = new Date();
    const [dueReviews, dueFeynman, remainingConcepts] = await Promise.all([
      this.prisma.aprendizadoFlashcard.count({
        where: { usuarioId: userId, proximaRevisao: { lte: now } },
      }),
      this.prisma.estadoFeynman.count({
        where: { usuarioId: userId, proximaRevisao: { lte: now } },
      }),
      this.remainingConcepts(userId, grafoId, prioridade),
    ]);
    return {
      dueReviews,
      dueFeynman,
      avgSecondsPerCard: DEFAULT_SECONDS_PER_CARD,
      remainingConcepts,
    };
  }

  // Conceitos da trilha que ainda não têm DesempenhoNo (nunca foram estudados).
  private async remainingConcepts(
    userId: string,
    grafoId: string,
    prioridade: string,
  ): Promise<number> {
    const refIds = await this.trilhaConceptIds(userId, grafoId, prioridade);
    if (refIds.length === 0) return 0;
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, tipoNode: TipoNode.CONCEITO, referenciaId: { in: refIds } },
      select: { id: true },
    });
    if (nodes.length === 0) return refIds.length;
    const studied = await this.prisma.desempenhoNo.count({
      where: { usuarioId: userId, nodeId: { in: nodes.map((n) => n.id) } },
    });
    return Math.max(0, refIds.length - studied);
  }

  private async trilhaConceptIds(userId: string, grafoId: string, modo: string): Promise<string[]> {
    const row = await this.prisma.roadmapTrilha.findUnique({
      where: { _trilha_uk: { grafoId, modo } },
      select: { usuarioId: true, itens: true },
    });
    if (!row || row.usuarioId !== userId) return [];
    const steps = (row.itens as unknown as TrilhaStep[]) ?? [];
    return steps.map((s) => s.nodeId).filter((id): id is string => typeof id === 'string');
  }
}
