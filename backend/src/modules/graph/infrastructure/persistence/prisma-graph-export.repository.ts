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

  listNodes(grafoId: string, userId: string): Promise<ExportNodeRow[]> {
    return this.prisma.nodeConhecimento.findMany({
      where: { grafoId, usuarioId: userId },
      select: {
        tipoNode: true,
        referenciaId: true,
        posicaoX: true,
        posicaoY: true,
        nivelDominio: true,
      },
    });
  }
}
