import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  ExportGraphHeader,
  ExportNodeRow,
  GraphExportRepository,
} from '../../domain/ports/graph-export-repository';

@Injectable()
export class PrismaGraphExportRepository implements GraphExportRepository {
  constructor(private readonly prisma: PrismaService) {}

  findGraph(grafoId: string, userId: string): Promise<ExportGraphHeader | null> {
    return this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { id: true, nome: true },
    });
  }

  // A posição vem da contenção — é desta vista que o vault está exportando.
  async listNodes(grafoId: string, userId: string): Promise<ExportNodeRow[]> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, contidoEm: { some: { grafoId } } },
      select: {
        tipoNode: true,
        referenciaId: true,
        nivelDominio: true,
        contidoEm: {
          where: { grafoId },
          select: { posicaoX: true, posicaoY: true, pesoEdital: true },
        },
      },
    });
    return nodes.map(({ contidoEm, ...n }) => ({
      ...n,
      posicaoX: contidoEm[0]?.posicaoX ?? null,
      posicaoY: contidoEm[0]?.posicaoY ?? null,
      pesoEdital: contidoEm[0]?.pesoEdital ?? null,
    }));
  }
}
