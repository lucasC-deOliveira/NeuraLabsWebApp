import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  BridgeCandidatesRepository,
  BridgeNode,
} from '../../domain/ports/bridge-candidates-repository';
import { bridgePairKey } from '../../domain/services/cross-graph-bridges';

// The graph a node is shown in, taken from its containment. A node contained in
// several graphs reports the first one — it is only used to label the review.
type ContainedNode = {
  referenciaId: string;
  contidoEm: { grafo: { nome: string; id: string } }[];
};

const NODE_SELECT = {
  referenciaId: true,
  contidoEm: { select: { grafo: { select: { id: true, nome: true } } }, take: 1 },
} as const;

@Injectable()
export class PrismaBridgeCandidatesRepository implements BridgeCandidatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadConceptsInGraph(userId: string, grafoId: string): Promise<BridgeNode[]> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, tipoNode: 'CONCEITO', contidoEm: { some: { grafoId } } },
      select: NODE_SELECT,
    });
    return this.withConceptNames(nodes);
  }

  // Concepts of every OTHER graph, excluding those already contained in this one:
  // a node shared by both graphs is not a bridge, it is the same node in view.
  async loadConceptsOutsideGraph(userId: string, grafoId: string): Promise<BridgeNode[]> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: {
        usuarioId: userId,
        tipoNode: 'CONCEITO',
        contidoEm: { some: { grafoId: { not: grafoId } }, none: { grafoId } },
      },
      select: NODE_SELECT,
    });
    return this.withConceptNames(nodes);
  }

  async loadExistingPairKeys(userId: string, nodeIds: string[]): Promise<Set<string>> {
    if (!nodeIds.length) return new Set();
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: {
        nodeOrigem: { usuarioId: userId, referenciaId: { in: nodeIds } },
        nodeDestino: { usuarioId: userId, referenciaId: { in: nodeIds } },
      },
      select: {
        nodeOrigem: { select: { referenciaId: true } },
        nodeDestino: { select: { referenciaId: true } },
      },
    });
    return toPairKeys(edges);
  }

  private async withConceptNames(nodes: ContainedNode[]): Promise<BridgeNode[]> {
    if (!nodes.length) return [];
    const conceitos = await this.prisma.conceito.findMany({
      where: { id: { in: nodes.map((n) => n.referenciaId) } },
      select: { id: true, nome: true, descricao: true },
    });
    const byId = new Map(conceitos.map((c) => [c.id, c]));
    return nodes.flatMap((node) => toBridgeNode(node, byId.get(node.referenciaId)));
  }
}

function toBridgeNode(
  node: ContainedNode,
  conceito: { nome: string; descricao: string | null } | undefined,
): BridgeNode[] {
  const grafo = node.contidoEm[0]?.grafo;
  if (!conceito || !grafo) return [];
  return [
    {
      id: node.referenciaId,
      nome: conceito.nome,
      tipo: 'CONCEITO',
      desc: conceito.descricao ?? '',
      grafoId: grafo.id,
      grafoNome: grafo.nome,
    },
  ];
}

function toPairKeys(
  edges: {
    nodeOrigem: { referenciaId: string } | null;
    nodeDestino: { referenciaId: string } | null;
  }[],
): Set<string> {
  const keys = new Set<string>();
  for (const edge of edges) {
    if (!edge.nodeOrigem || !edge.nodeDestino) continue;
    keys.add(bridgePairKey(edge.nodeOrigem.referenciaId, edge.nodeDestino.referenciaId));
  }
  return keys;
}
