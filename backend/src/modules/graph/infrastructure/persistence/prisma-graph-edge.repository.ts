import { Injectable } from '@nestjs/common';
import { type TipoRelacao } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  CreateEdgeData,
  GraphEdgeRepository,
  GraphNodeRef,
} from '../../domain/ports/graph-edge-repository';

@Injectable()
export class PrismaGraphEdgeRepository implements GraphEdgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findNodeInGraph(
    grafoId: string,
    userId: string,
    referenciaId: string,
  ): Promise<GraphNodeRef | null> {
    const node = await this.prisma.nodeConhecimento.findFirst({
      where: { referenciaId, usuarioId: userId, grafoId },
      select: { id: true, tipoNode: true },
    });
    return node ? { id: node.id, tipoNode: node.tipoNode } : null;
  }

  async edgeExists(
    grafoId: string,
    sourceNodeId: string,
    targetNodeId: string,
    tipoRelacao: string,
  ): Promise<boolean> {
    const dup = await this.prisma.conhecimentoAresta.findFirst({
      where: {
        grafoId,
        nodeOrigemId: sourceNodeId,
        nodeDestinoId: targetNodeId,
        tipoRelacao: tipoRelacao as TipoRelacao,
      },
      select: { id: true },
    });
    return dup !== null;
  }

  async createEdge(data: CreateEdgeData): Promise<{ id: string }> {
    const edge = await this.prisma.conhecimentoAresta.create({
      data: {
        grafoId: data.grafoId,
        nodeOrigemId: data.sourceNodeId,
        nodeDestinoId: data.targetNodeId,
        tipoRelacao: data.tipoRelacao as TipoRelacao,
        peso: data.peso,
      },
      select: { id: true },
    });
    return { id: edge.id };
  }

  async findOwnedEdge(
    grafoId: string,
    edgeId: string,
    userId: string,
  ): Promise<{ id: string } | null> {
    const edge = await this.prisma.conhecimentoAresta.findFirst({
      where: { id: edgeId, grafoId, nodeOrigem: { usuarioId: userId } },
      select: { id: true },
    });
    return edge ? { id: edge.id } : null;
  }

  async updateEdge(edgeId: string, data: { tipoRelacao?: string; peso?: number }): Promise<void> {
    await this.prisma.conhecimentoAresta.update({
      where: { id: edgeId },
      data: {
        tipoRelacao: data.tipoRelacao ? (data.tipoRelacao as TipoRelacao) : undefined,
        peso: data.peso,
      },
    });
  }

  async deleteEdge(edgeId: string): Promise<void> {
    await this.prisma.conhecimentoAresta.delete({ where: { id: edgeId } });
  }
}
