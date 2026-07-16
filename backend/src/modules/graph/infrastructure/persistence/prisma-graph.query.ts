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
import { relationTier } from '../../domain/services/assunto-weight';

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

type AssuntoNodeRow = { id: string; grafoId: string | null; referenciaId: string };
type EdgeRow = {
  nodeOrigemId: string | null;
  nodeDestinoId: string | null;
  tipoRelacao: string;
  peso: number;
};

// Agrupa os nós ASSUNTO por grafo em tags {id, nome, peso} distintas, ordenadas
// por peso de prioridade (desc) e, no empate, por nome.
function groupAssuntos(
  nodes: AssuntoNodeRow[],
  names: Map<string, string>,
  weights: Map<string, number>,
): Map<string, GraphAssunto[]> {
  const byGraph = new Map<string, GraphAssunto[]>();
  for (const n of nodes) {
    const nome = n.grafoId ? names.get(n.referenciaId) : undefined;
    if (!n.grafoId || !nome) continue;
    const list = byGraph.get(n.grafoId) ?? [];
    if (!list.some((a) => a.id === n.referenciaId))
      list.push({ id: n.referenciaId, nome, peso: weights.get(n.id) ?? 0 });
    byGraph.set(n.grafoId, list);
  }
  for (const list of byGraph.values()) list.sort(byWeightThenName);
  return byGraph;
}

function byWeightThenName(a: GraphAssunto, b: GraphAssunto): number {
  return b.peso - a.peso || a.nome.localeCompare(b.nome);
}

// Soma o peso de prioridade (tier do tipo × peso da aresta) em cada nó ASSUNTO.
function accumulateWeights(nodeIds: string[], edges: EdgeRow[]): Map<string, number> {
  const ids = new Set(nodeIds);
  const weights = new Map<string, number>();
  for (const e of edges) {
    const w = relationTier(e.tipoRelacao) * e.peso;
    addWeight(weights, e.nodeOrigemId, ids, w);
    addWeight(weights, e.nodeDestinoId, ids, w);
  }
  return weights;
}

function addWeight(
  weights: Map<string, number>,
  nodeId: string | null,
  ids: Set<string>,
  w: number,
): void {
  if (!nodeId || !ids.has(nodeId)) return;
  weights.set(nodeId, (weights.get(nodeId) ?? 0) + w);
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

  // Um assunto pode estar em VÁRIOS dos grafos pedidos (o nó é do sistema; o grafo
  // só o contém), então cada par (grafo, assunto) vira uma linha — que é a forma
  // que groupAssuntos espera.
  private async assuntoNodesOf(
    userId: string,
    graphIds: string[],
  ): Promise<{ id: string; grafoId: string; referenciaId: string }[]> {
    const emAlgum = { grafoId: { in: graphIds } };
    const rows = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, tipoNode: TipoNode.ASSUNTO, contidoEm: { some: emAlgum } },
      select: {
        id: true,
        referenciaId: true,
        contidoEm: { where: emAlgum, select: { grafoId: true } },
      },
    });
    return rows.flatMap((n) =>
      n.contidoEm.map((c) => ({ id: n.id, grafoId: c.grafoId, referenciaId: n.referenciaId })),
    );
  }

  // Tags de assunto (nós ASSUNTO → nome da entidade Assunto) por grafo da página,
  // já com o peso de prioridade derivado das conexões de cada nó.
  private async assuntosByGraph(
    userId: string,
    graphIds: string[],
  ): Promise<Map<string, GraphAssunto[]>> {
    if (graphIds.length === 0) return new Map();
    const nodes = await this.assuntoNodesOf(userId, graphIds);
    const [names, weights] = await Promise.all([
      this.assuntoNames(
        userId,
        nodes.map((n) => n.referenciaId),
      ),
      this.assuntoWeights(nodes.map((n) => n.id)),
    ]);
    return groupAssuntos(nodes, names, weights);
  }

  // Peso de prioridade por nó ASSUNTO: soma tier(tipo) × peso das arestas incidentes.
  private async assuntoWeights(nodeIds: string[]): Promise<Map<string, number>> {
    if (nodeIds.length === 0) return new Map();
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: { OR: [{ nodeOrigemId: { in: nodeIds } }, { nodeDestinoId: { in: nodeIds } }] },
      select: { nodeOrigemId: true, nodeDestinoId: true, tipoRelacao: true, peso: true },
    });
    return accumulateWeights(nodeIds, edges);
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
      where: { usuarioId: userId, tipoNode: TipoNode.ASSUNTO, contidoEm: { some: {} } },
      distinct: ['referenciaId'],
      select: { referenciaId: true },
    });
    const names = await this.assuntoNames(
      userId,
      nodes.map((n) => n.referenciaId),
    );
    // Opções do filtro não são por-grafo, então o peso não se aplica (0).
    return [...names.entries()]
      .map(([id, nome]) => ({ id, nome, peso: 0 }))
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
