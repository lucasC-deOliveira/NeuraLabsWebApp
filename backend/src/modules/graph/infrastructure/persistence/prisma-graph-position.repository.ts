import { Injectable } from '@nestjs/common';
import { type Prisma, type TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GraphPositionRepository } from '../../domain/ports/graph-position-repository';
import type { PositionUpdate } from '../../domain/services/position-plan';

// Move o nó NESTA vista. A posição vive na contenção porque é dela: arrastar um nó
// no grafo A não pode movê-lo no grafo B. O nó também é atualizado enquanto a
// coluna existir (modelo antigo, sai na fase 5).
async function moveNode(
  tx: Prisma.TransactionClient,
  userId: string,
  grafoId: string,
  u: PositionUpdate,
): Promise<void> {
  const where = {
    usuarioId: userId,
    tipoNode: u.tipoNode as TipoNode,
    referenciaId: u.referenciaId,
    contidoEm: { some: { grafoId } },
  };
  const nos = await tx.nodeConhecimento.findMany({ where, select: { id: true } });
  if (nos.length === 0) return;
  const nodeId = { in: nos.map((n) => n.id) };
  const posicao = { posicaoX: u.x, posicaoY: u.y };
  await tx.grafoNode.updateMany({ where: { grafoId, nodeId }, data: posicao });
  await tx.nodeConhecimento.updateMany({ where: { id: nodeId }, data: posicao });
}

@Injectable()
export class PrismaGraphPositionRepository implements GraphPositionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // A posição é da VISTA: arrastar um nó no grafo A não pode movê-lo no grafo B.
  // Por isso ela é gravada na contenção. O nó também é atualizado enquanto a coluna
  // existir (modelo antigo, sai na fase 5).
  async applyPositions(userId: string, grafoId: string, updates: PositionUpdate[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const u of updates) await moveNode(tx, userId, grafoId, u);
    });
  }
}
