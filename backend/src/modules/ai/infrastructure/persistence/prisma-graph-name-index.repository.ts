import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import { buildNameIndex, type GraphNameIndex } from '../../domain/services/name-index';
import { refIdsByType } from './structural-nodes';

const NAME_SELECT = { id: true, nome: true } as const;

@Injectable()
export class PrismaGraphNameIndexRepository implements GraphNameIndexRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadNameIndex(userId: string, grafoId: string): Promise<GraphNameIndex> {
    const ids = await refIdsByType(this.prisma, userId, grafoId);
    const [assuntos, topicos, conceitos] = await Promise.all([
      this.prisma.assunto.findMany({
        where: { id: { in: ids.ASSUNTO ?? [] } },
        select: NAME_SELECT,
      }),
      this.prisma.topico.findMany({ where: { id: { in: ids.TOPICO ?? [] } }, select: NAME_SELECT }),
      this.prisma.conceito.findMany({
        where: { id: { in: ids.CONCEITO ?? [] } },
        select: NAME_SELECT,
      }),
    ]);
    return buildNameIndex(assuntos, topicos, conceitos);
  }
}
