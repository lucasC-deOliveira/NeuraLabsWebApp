import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { DuplicateMergeRepository } from '../../domain/ports/duplicate-merge-repository';
import type { MergeEdge } from '../../domain/services/edge-merge';

@Injectable()
export class PrismaDuplicateMergeRepository implements DuplicateMergeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findNodeLinkId(userId: string, grafoId: string, refId: string): Promise<string | null> {
    const nc = await this.prisma.nodeConhecimento.findFirst({
      where: { grafoId, usuarioId: userId, referenciaId: refId },
      select: { id: true },
    });
    return nc?.id ?? null;
  }

  loadAdjacentEdges(ncId: string): Promise<MergeEdge[]> {
    return this.prisma.conhecimentoAresta.findMany({
      where: { OR: [{ nodeOrigemId: ncId }, { nodeDestinoId: ncId }] },
      select: { id: true, nodeOrigemId: true, nodeDestinoId: true, tipoRelacao: true },
    });
  }

  async moveEdges(moveSrc: string[], moveTgt: string[], keepNcId: string): Promise<number> {
    const [src, tgt] = await Promise.all([
      this.updateEndpoint(moveSrc, { nodeOrigemId: keepNcId }),
      this.updateEndpoint(moveTgt, { nodeDestinoId: keepNcId }),
    ]);
    return src + tgt;
  }

  private async updateEndpoint(
    ids: string[],
    data: { nodeOrigemId: string } | { nodeDestinoId: string },
  ): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await this.prisma.conhecimentoAresta.updateMany({
      where: { id: { in: ids } },
      data,
    });
    return res.count;
  }

  async deleteEdgesOf(ncId: string): Promise<void> {
    await this.prisma.conhecimentoAresta.deleteMany({
      where: { OR: [{ nodeOrigemId: ncId }, { nodeDestinoId: ncId }] },
    });
  }
}
