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
import { containNode, createContainedNode, releaseNode } from './node-containment';

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
  // "Mover" deixou de ser reapontar um FK: é o filho passar a conter e o pai a
  // soltar. A posição vai junto porque é da vista — o nó ocupa o mesmo lugar no
  // filho onde estava no pai.
  private async moveAndRewire(
    tx: Prisma.TransactionClient,
    c: ExtractSubgraphCommand,
    childId: string,
  ): Promise<void> {
    for (const nodeRowId of c.nodeRowIds) {
      const atual = await tx.grafoNode.findUnique({
        where: { grafoId_nodeId: { grafoId: c.parentGrafoId, nodeId: nodeRowId } },
        select: { posicaoX: true, posicaoY: true },
      });
      await containNode(tx, childId, nodeRowId, atual?.posicaoX, atual?.posicaoY);
      await releaseNode(tx, c.parentGrafoId, nodeRowId);
    }
    // Modelo antigo (id_grafo), ainda lido por importância/roadmap/deleção: sai na fase 5.
    await tx.nodeConhecimento.updateMany({
      where: { id: { in: c.nodeRowIds } },
      data: { grafoId: childId },
    });
    const refNodeId = await this.createRefNode(tx, c, childId);
    await this.rewireEdges(tx, c, refNodeId);
  }

  private createRefNode(
    tx: Prisma.TransactionClient,
    c: ExtractSubgraphCommand,
    childId: string,
  ): Promise<string> {
    return createContainedNode(tx, {
      usuarioId: c.userId,
      grafoId: c.parentGrafoId,
      tipoNode: 'GRAFO_REF',
      referenciaId: childId,
      posicaoX: c.center.x,
      posicaoY: c.center.y,
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
