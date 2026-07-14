import { Injectable } from '@nestjs/common';
import { Prisma, TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  GraphAssunto,
  GraphInfoView,
  GraphListPage,
  GraphListQuery,
  GraphQuery,
  GraphSortField,
  GraphSummary,
} from '../../domain/ports/graph-query';

const SUMMARY_SELECT = {
  id: true,
  nome: true,
  descricao: true,
  parentGrafoId: true,
  tipoRelacaoPai: true,
  dataCriacao: true,
  dataAtualizacao: true,
  _count: { select: { filhos: true } },
} satisfies Prisma.GrafosConhecimentoSelect;

function dateRange(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  const range: Prisma.DateTimeFilter = {};
  if (from) range.gte = from;
  if (to) range.lte = to;
  return range;
}

function buildWhere(userId: string, query: GraphListQuery): Prisma.GrafosConhecimentoWhereInput {
  const where: Prisma.GrafosConhecimentoWhereInput = { usuarioId: userId };
  if (query.q)
    where.OR = [
      { nome: { contains: query.q, mode: 'insensitive' } },
      { descricao: { contains: query.q, mode: 'insensitive' } },
    ];
  if (query.tipo === 'raiz') where.parentGrafoId = null;
  if (query.tipo === 'subgrafo') where.parentGrafoId = { not: null };
  const created = dateRange(query.createdFrom, query.createdTo);
  if (created) where.dataCriacao = created;
  if (query.assuntoIds?.length)
    where.nodes = { some: { tipoNode: TipoNode.ASSUNTO, referenciaId: { in: query.assuntoIds } } };
  return where;
}

function buildOrderBy(sort: GraphSortField): Prisma.GrafosConhecimentoOrderByWithRelationInput {
  switch (sort) {
    case 'atualizados':
      return { dataAtualizacao: 'desc' };
    case 'alfabetica':
      return { nome: 'asc' };
    case 'subgrafos':
      return { filhos: { _count: 'desc' } };
    default:
      return { dataCriacao: 'desc' };
  }
}

// Agrupa os nós ASSUNTO por grafo em tags {id, nome} distintas e ordenadas.
function groupAssuntos(
  nodes: { grafoId: string | null; referenciaId: string }[],
  names: Map<string, string>,
): Map<string, GraphAssunto[]> {
  const byGraph = new Map<string, GraphAssunto[]>();
  for (const n of nodes) {
    const nome = n.grafoId ? names.get(n.referenciaId) : undefined;
    if (!n.grafoId || !nome) continue;
    const list = byGraph.get(n.grafoId) ?? [];
    if (!list.some((a) => a.id === n.referenciaId)) list.push({ id: n.referenciaId, nome });
    byGraph.set(n.grafoId, list);
  }
  for (const list of byGraph.values()) list.sort((a, b) => a.nome.localeCompare(b.nome));
  return byGraph;
}

type SummaryRow = Prisma.GrafosConhecimentoGetPayload<{ select: typeof SUMMARY_SELECT }>;

// Monta os GraphSummary a partir das linhas do Prisma + as tags de assunto por grafo.
function toSummaries(rows: SummaryRow[], tags: Map<string, GraphAssunto[]>): GraphSummary[] {
  return rows.map(({ _count, ...g }) => ({
    ...g,
    filhosCount: _count.filhos,
    assuntos: tags.get(g.id) ?? [],
  }));
}

@Injectable()
export class PrismaGraphQuery implements GraphQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, query: GraphListQuery): Promise<GraphListPage> {
    const where = buildWhere(userId, query);
    const [rows, total] = await Promise.all([
      this.prisma.grafosConhecimento.findMany({
        where,
        orderBy: buildOrderBy(query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: SUMMARY_SELECT,
      }),
      this.prisma.grafosConhecimento.count({ where }),
    ]);
    const tags = await this.assuntosByGraph(
      userId,
      rows.map((r) => r.id),
    );
    const items = toSummaries(rows, tags);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  // Tags de assunto (nós ASSUNTO → nome da entidade Assunto) por grafo da página.
  private async assuntosByGraph(
    userId: string,
    graphIds: string[],
  ): Promise<Map<string, GraphAssunto[]>> {
    if (graphIds.length === 0) return new Map();
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, grafoId: { in: graphIds }, tipoNode: TipoNode.ASSUNTO },
      select: { grafoId: true, referenciaId: true },
    });
    const names = await this.assuntoNames(
      userId,
      nodes.map((n) => n.referenciaId),
    );
    return groupAssuntos(nodes, names);
  }

  // Resolve os nomes das entidades Assunto por id (soft reference — sem FK).
  private async assuntoNames(userId: string, refIds: string[]): Promise<Map<string, string>> {
    const ids = [...new Set(refIds)];
    if (ids.length === 0) return new Map();
    const assuntos = await this.prisma.assunto.findMany({
      where: { id: { in: ids }, usuarioId: userId },
      select: { id: true, nome: true },
    });
    return new Map(assuntos.map((a) => [a.id, a.nome]));
  }

  async listAssuntos(userId: string): Promise<GraphAssunto[]> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, grafoId: { not: null }, tipoNode: TipoNode.ASSUNTO },
      distinct: ['referenciaId'],
      select: { referenciaId: true },
    });
    const names = await this.assuntoNames(
      userId,
      nodes.map((n) => n.referenciaId),
    );
    return [...names.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
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
