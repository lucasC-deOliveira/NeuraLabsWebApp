import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  DuplicateGraphNode,
  DuplicateNodesRepository,
} from '../../domain/ports/duplicate-nodes-repository';

const SELECT = { id: true, nome: true, descricao: true } as const;

type EntityRow = { id: string; nome: string; descricao: string | null };

const toNodes = (rows: EntityRow[], tipo: string): DuplicateGraphNode[] =>
  rows.map((r) => ({ id: r.id, tipo, nome: r.nome, desc: r.descricao ?? '' }));

@Injectable()
export class PrismaDuplicateNodesRepository implements DuplicateNodesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadGraphNodes(userId: string, grafoId: string): Promise<DuplicateGraphNode[]> {
    const ids = await this.refIdsByType(userId, grafoId);
    const [assuntos, topicos, conceitos] = await Promise.all([
      this.prisma.assunto.findMany({ where: { id: { in: ids.ASSUNTO ?? [] } }, select: SELECT }),
      this.prisma.topico.findMany({ where: { id: { in: ids.TOPICO ?? [] } }, select: SELECT }),
      this.prisma.conceito.findMany({ where: { id: { in: ids.CONCEITO ?? [] } }, select: SELECT }),
    ]);
    return [
      ...toNodes(assuntos, 'ASSUNTO'),
      ...toNodes(topicos, 'TOPICO'),
      ...toNodes(conceitos, 'CONCEITO'),
    ];
  }

  private async refIdsByType(userId: string, grafoId: string): Promise<Record<string, string[]>> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { grafoId, usuarioId: userId },
      select: { tipoNode: true, referenciaId: true },
    });
    const ids: Record<string, string[]> = {};
    for (const n of nodes) (ids[n.tipoNode] ??= []).push(n.referenciaId);
    return ids;
  }
}
