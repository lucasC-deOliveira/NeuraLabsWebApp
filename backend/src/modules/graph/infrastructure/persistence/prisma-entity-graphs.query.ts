import { Injectable } from '@nestjs/common';
import { TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { EntityGraphRef, EntityGraphsQuery } from '../../domain/ports/entity-graphs-query';

@Injectable()
export class PrismaEntityGraphsQuery implements EntityGraphsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async graphsContaining(
    userId: string,
    tipoNode: string,
    referenciaId: string,
  ): Promise<EntityGraphRef[]> {
    // O nó é do sistema (usuário, tipo, referência); a contenção diz em quais
    // grafos ele aparece. Escopado por usuário para não vazar grafo de outra conta.
    const rows = await this.prisma.grafoNode.findMany({
      where: {
        node: { usuarioId: userId, tipoNode: tipoNode as TipoNode, referenciaId },
      },
      select: { grafo: { select: { id: true, nome: true } } },
    });
    return rows.map((r) => ({ grafoId: r.grafo.id, nome: r.grafo.nome }));
  }
}
