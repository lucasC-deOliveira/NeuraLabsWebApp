import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ClusterNodesRepository } from '../../domain/ports/cluster-nodes-repository';
import type { ClusterNode } from '../../domain/services/cluster-context';

type Named = { nome: string; descricao: string | null };
type NotaRow = { titulo: string; conteudo: string };

const NAMED_SELECT = { nome: true, descricao: true } as const;

const named = (rows: Named[], tipo: string): ClusterNode[] =>
  rows.map((r) => ({ tipo, nome: r.nome, corpo: r.descricao }));

const combineNamed = (assuntos: Named[], topicos: Named[], conceitos: Named[]): ClusterNode[] => [
  ...named(assuntos, 'ASSUNTO'),
  ...named(topicos, 'TOPICO'),
  ...named(conceitos, 'CONCEITO'),
];

@Injectable()
export class PrismaClusterNodesRepository implements ClusterNodesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadClusterContent(
    userId: string,
    grafoId: string,
    nodeIds: string[],
  ): Promise<ClusterNode[]> {
    const ids = await this.groupIds(userId, grafoId, nodeIds);
    const [named3, notas] = await Promise.all([this.loadNamed(ids), this.loadNotas(ids.NOTA)]);
    return [...named3, ...notas.map((n) => ({ tipo: 'NOTA', nome: n.titulo, corpo: n.conteudo }))];
  }

  private async loadNamed(ids: Record<string, string[]>): Promise<ClusterNode[]> {
    const [assuntos, topicos, conceitos] = await Promise.all([
      this.prisma.assunto.findMany({
        where: { id: { in: ids.ASSUNTO ?? [] } },
        select: NAMED_SELECT,
      }),
      this.prisma.topico.findMany({
        where: { id: { in: ids.TOPICO ?? [] } },
        select: NAMED_SELECT,
      }),
      this.prisma.conceito.findMany({
        where: { id: { in: ids.CONCEITO ?? [] } },
        select: NAMED_SELECT,
      }),
    ]);
    return combineNamed(assuntos, topicos, conceitos);
  }

  private loadNotas(noteIds: string[] | undefined): Promise<NotaRow[]> {
    return this.prisma.nota.findMany({
      where: { id: { in: noteIds ?? [] } },
      select: { titulo: true, conteudo: true },
    });
  }

  private async groupIds(
    userId: string,
    grafoId: string,
    nodeIds: string[],
  ): Promise<Record<string, string[]>> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, referenciaId: { in: nodeIds }, contidoEm: { some: { grafoId } } },
      select: { tipoNode: true, referenciaId: true },
    });
    const ids: Record<string, string[]> = {};
    for (const n of nodes) (ids[n.tipoNode] ??= []).push(n.referenciaId);
    return ids;
  }
}
