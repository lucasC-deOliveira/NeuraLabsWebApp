import { Injectable } from '@nestjs/common';
import { TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { PlanContext, PlanContextQuery } from '../../domain/ports/plan-context-query';
import { dedupeConceptOrder } from '../../domain/services/roadmap-concept-order';

// Estimativa fixa por card no v1 (o histórico tem tempo por revisão, mas a unidade
// varia entre importações; usar do histórico fica para um passo futuro).
const DEFAULT_SECONDS_PER_CARD = 20;

/**
 * Números do dia do plano. v1: backlog GLOBAL (a memória é global — o recorte pelos
 * grafos do plano é sobre os NOVOS, via roadmap); "restantes" = conceitos das trilhas
 * (dos grafos do plano) ainda sem desempenho (nunca estudados).
 * @example ctx.load('u1', ['g1', 'g2'], 'prova')
 */
@Injectable()
export class PrismaPlanContextQuery implements PlanContextQuery {
  constructor(private readonly prisma: PrismaService) {}

  async load(userId: string, grafoIds: string[], prioridade: string): Promise<PlanContext> {
    const now = new Date();
    const [dueReviews, dueFeynman, remainingConcepts] = await Promise.all([
      this.prisma.aprendizadoFlashcard.count({
        where: { usuarioId: userId, proximaRevisao: { lte: now } },
      }),
      this.prisma.estadoFeynman.count({
        where: { usuarioId: userId, proximaRevisao: { lte: now } },
      }),
      this.remainingConcepts(userId, grafoIds, prioridade),
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
    grafoIds: string[],
    prioridade: string,
  ): Promise<number> {
    const refIds = await this.trilhaConceptIds(userId, grafoIds, prioridade);
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

  // Conceitos das trilhas dos grafos do plano (união sem repetir), no modo escolhido.
  private async trilhaConceptIds(
    userId: string,
    grafoIds: string[],
    modo: string,
  ): Promise<string[]> {
    if (grafoIds.length === 0) return [];
    const rows = await this.prisma.roadmapTrilha.findMany({
      where: { usuarioId: userId, grafoId: { in: grafoIds }, modo },
      select: { itens: true },
    });
    return dedupeConceptOrder(rows);
  }
}
