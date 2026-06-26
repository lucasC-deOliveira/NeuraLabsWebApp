import { Injectable } from '@nestjs/common';
import { type TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GraphPositionRepository } from '../../domain/ports/graph-position-repository';
import type { PositionUpdate } from '../../domain/services/position-plan';

@Injectable()
export class PrismaGraphPositionRepository implements GraphPositionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async applyPositions(userId: string, grafoId: string, updates: PositionUpdate[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const u of updates) {
        await tx.nodeConhecimento.updateMany({
          where: {
            grafoId,
            usuarioId: userId,
            tipoNode: u.tipoNode as TipoNode,
            referenciaId: u.referenciaId,
          },
          data: { posicaoX: u.x, posicaoY: u.y },
        });
      }
    });
  }
}
