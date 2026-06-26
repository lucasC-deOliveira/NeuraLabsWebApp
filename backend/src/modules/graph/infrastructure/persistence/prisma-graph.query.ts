import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GraphInfoView, GraphQuery, GraphSummary } from '../../domain/ports/graph-query';

@Injectable()
export class PrismaGraphQuery implements GraphQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<GraphSummary[]> {
    const grafos = await this.prisma.grafosConhecimento.findMany({
      where: { usuarioId: userId },
      orderBy: { dataCriacao: 'desc' },
      select: {
        id: true,
        nome: true,
        descricao: true,
        parentGrafoId: true,
        tipoRelacaoPai: true,
        dataCriacao: true,
        dataAtualizacao: true,
        _count: { select: { filhos: true } },
      },
    });
    return grafos.map(({ _count, ...g }) => ({ ...g, filhosCount: _count.filhos }));
  }

  async findInfo(userId: string, grafoId: string): Promise<GraphInfoView | null> {
    const g = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      include: {
        parent: { select: { id: true, nome: true } },
        _count: { select: { filhos: true } },
      },
    });
    if (!g) return null;
    return {
      nome: g.nome,
      descricao: g.descricao ?? undefined,
      parentGrafoId: g.parentGrafoId ?? null,
      parentNome: g.parent?.nome ?? null,
      tipoRelacaoPai: g.tipoRelacaoPai ?? null,
      filhosCount: g._count.filhos,
    };
  }
}
