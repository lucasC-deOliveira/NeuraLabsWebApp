import { Injectable } from '@nestjs/common';
import { Prisma, TipoNode, TipoRelacao } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { createContainedNode } from './node-containment';
import type {
  ComposeIntoGraphRepository,
  ComposeResult,
} from '../../domain/ports/compose-into-graph-repository';
import type { CompositionGraph } from '../../domain/composition-views';

const edgeKey = (origem: string, destino: string, rel: string): string => `${origem}->${destino}->${rel}`;

interface EdgeRow {
  nodeOrigemId: string;
  nodeDestinoId: string;
  tipoRelacao: TipoRelacao;
}

// Arestas da composição (traduzidas para ids de nó) que ainda não existem.
function pendingEdges(graph: CompositionGraph, idMap: Map<string, string>, seen: Set<string>): EdgeRow[] {
  return graph.edges
    .map((e) => ({
      nodeOrigemId: idMap.get(e.source) ?? '',
      nodeDestinoId: idMap.get(e.target) ?? '',
      tipoRelacao: e.rel as TipoRelacao,
    }))
    .filter((e) => !seen.has(edgeKey(e.nodeOrigemId, e.nodeDestinoId, e.tipoRelacao)));
}

// Cria as arestas que ainda não existem entre os nós contidos (dedup por
// origem→destino→relação, o mesmo critério do import).
async function createEdges(
  tx: Prisma.TransactionClient,
  idMap: Map<string, string>,
  graph: CompositionGraph,
): Promise<number> {
  const nodeIds = [...idMap.values()];
  const existing = await tx.conhecimentoAresta.findMany({
    where: { nodeOrigemId: { in: nodeIds }, nodeDestinoId: { in: nodeIds } },
    select: { nodeOrigemId: true, nodeDestinoId: true, tipoRelacao: true },
  });
  const seen = new Set(existing.map((e) => edgeKey(e.nodeOrigemId ?? '', e.nodeDestinoId ?? '', e.tipoRelacao)));
  const toCreate = pendingEdges(graph, idMap, seen);
  if (toCreate.length > 0) await tx.conhecimentoAresta.createMany({ data: toCreate });
  return toCreate.length;
}

// Garante cada nó da composição (reusa por referência) e liga as arestas.
async function mergeIntoGrafo(
  tx: Prisma.TransactionClient,
  userId: string,
  grafoId: string,
  graph: CompositionGraph,
): Promise<ComposeResult> {
  const idMap = new Map<string, string>();
  for (const node of graph.nodes) {
    const nodeId = await createContainedNode(tx, {
      usuarioId: userId,
      grafoId,
      tipoNode: node.type as TipoNode,
      referenciaId: node.id,
    });
    idMap.set(node.id, nodeId);
  }
  return { nodes: graph.nodes.length, edges: await createEdges(tx, idMap, graph) };
}

// Injeta a composição de um item num grafo, seguindo as regras que já existem
// (createContainedNode = nó único por referência + contenção idempotente).
@Injectable()
export class PrismaComposeIntoGraphRepository implements ComposeIntoGraphRepository {
  constructor(private readonly prisma: PrismaService) {}

  async compose(userId: string, grafoId: string, graph: CompositionGraph): Promise<ComposeResult | null> {
    const grafo = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { id: true },
    });
    if (!grafo) return null;
    return this.prisma.$transaction((tx) => mergeIntoGrafo(tx, userId, grafoId, graph));
  }
}
