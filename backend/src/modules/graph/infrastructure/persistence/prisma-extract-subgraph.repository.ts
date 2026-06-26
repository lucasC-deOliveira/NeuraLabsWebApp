import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { rewireEndpoints } from '../../domain/services/subgraph-extraction';
import type {
  ExtractableNode,
  ExtractSubgraphCommand,
  ExtractSubgraphRepository,
  ExtractSubgraphResult,
} from '../../domain/ports/extract-subgraph-repository';
import type { ExtractEdge } from '../../domain/services/subgraph-extraction';

@Injectable()
export class PrismaExtractSubgraphRepository implements ExtractSubgraphRepository {
  constructor(private readonly prisma: PrismaService) {}

  async parentExists(parentGrafoId: string, userId: string): Promise<boolean> {
    const parent = await this.prisma.grafosConhecimento.findFirst({
      where: { id: parentGrafoId, usuarioId: userId },
      select: { id: true },
    });
    return parent !== null;
  }

  findExtractableNodes(
    userId: string,
    parentGrafoId: string,
    referenciaIds: string[],
  ): Promise<ExtractableNode[]> {
    return this.prisma.nodeConhecimento.findMany({
      where: { grafoId: parentGrafoId, usuarioId: userId, referenciaId: { in: referenciaIds } },
      select: { id: true, posicaoX: true, posicaoY: true },
    });
  }

  findEdgesTouching(parentGrafoId: string, nodeRowIds: string[]): Promise<ExtractEdge[]> {
    return this.prisma.conhecimentoAresta.findMany({
      where: {
        grafoId: parentGrafoId,
        OR: [{ nodeOrigemId: { in: nodeRowIds } }, { nodeDestinoId: { in: nodeRowIds } }],
      },
      select: { id: true, nodeOrigemId: true, nodeDestinoId: true },
    });
  }

  async extract(c: ExtractSubgraphCommand): Promise<ExtractSubgraphResult> {
    return this.prisma.$transaction(async (tx) => {
      const filho = await this.createChildGraph(tx, c);
      await this.moveAndRewire(tx, c, filho.id);
      return {
        grafoId: filho.id,
        grafoRefNodeId: filho.id,
        movedCount: c.nodeRowIds.length,
        rewiredEdgeCount: c.externalEdges.length,
      };
    });
  }

  // Moves the selected nodes into the child, drops a GRAFO_REF at the centroid in
  // the parent, and rewires the boundary edges to that GRAFO_REF.
  private async moveAndRewire(
    tx: Prisma.TransactionClient,
    c: ExtractSubgraphCommand,
    childId: string,
  ): Promise<void> {
    await tx.nodeConhecimento.updateMany({
      where: { id: { in: c.nodeRowIds } },
      data: { grafoId: childId },
    });
    const refNode = await this.createRefNode(tx, c, childId);
    await this.rewireEdges(tx, c, refNode.id);
  }

  private createRefNode(
    tx: Prisma.TransactionClient,
    c: ExtractSubgraphCommand,
    childId: string,
  ): Promise<{ id: string }> {
    return tx.nodeConhecimento.create({
      data: {
        grafoId: c.parentGrafoId,
        tipoNode: 'GRAFO_REF',
        referenciaId: childId,
        usuarioId: c.userId,
        posicaoX: c.center.x,
        posicaoY: c.center.y,
      },
      select: { id: true },
    });
  }

  private createChildGraph(
    tx: Prisma.TransactionClient,
    c: ExtractSubgraphCommand,
  ): Promise<{ id: string }> {
    return tx.grafosConhecimento.create({
      data: {
        usuarioId: c.userId,
        nome: c.nome.trim(),
        descricao: null,
        parentGrafoId: c.parentGrafoId,
        tipoRelacaoPai: c.tipoRelacao,
      },
      select: { id: true },
    });
  }

  private async rewireEdges(
    tx: Prisma.TransactionClient,
    c: ExtractSubgraphCommand,
    refNodeId: string,
  ): Promise<void> {
    for (const edge of c.externalEdges) {
      await tx.conhecimentoAresta.update({
        where: { id: edge.id },
        data: rewireEndpoints(edge, c.innerNodeIds, refNodeId),
      });
    }
  }
}
