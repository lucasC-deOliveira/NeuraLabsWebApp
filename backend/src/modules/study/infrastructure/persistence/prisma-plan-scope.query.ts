import { Injectable } from '@nestjs/common';
import { TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { PlanScope, PlanScopeQuery } from '../../domain/ports/plan-scope-query';

/**
 * Diz se os grafos escolhidos contêm prova/edital — para a UI liberar os modos
 * prova/edital (o roadmap desses modos usa as provas/editais de dentro do grafo,
 * mesmo sem uma prova avulsa no conteúdo).
 * @example query.capabilities('u1', ['g1', 'g2']) // → { hasProva: true, hasEdital: false }
 */
@Injectable()
export class PrismaPlanScopeQuery implements PlanScopeQuery {
  constructor(private readonly prisma: PrismaService) {}

  async capabilities(userId: string, grafoIds: string[]): Promise<PlanScope> {
    if (grafoIds.length === 0) return { hasProva: false, hasEdital: false };
    const [provas, editais] = await Promise.all([
      this.countNodes(userId, grafoIds, TipoNode.PROVA),
      this.countNodes(userId, grafoIds, TipoNode.EDITAL),
    ]);
    return { hasProva: provas > 0, hasEdital: editais > 0 };
  }

  // Quantos nós do tipo estão contidos em algum dos grafos.
  private countNodes(userId: string, grafoIds: string[], tipo: TipoNode): Promise<number> {
    return this.prisma.nodeConhecimento.count({
      where: {
        usuarioId: userId,
        tipoNode: tipo,
        contidoEm: { some: { grafoId: { in: grafoIds } } },
      },
    });
  }
}
