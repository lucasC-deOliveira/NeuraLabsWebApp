import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  CreateSubgraphInput,
  CreateSubgraphRepository,
} from '../../domain/ports/create-subgraph-repository';

@Injectable()
export class PrismaCreateSubgraphRepository implements CreateSubgraphRepository {
  constructor(private readonly prisma: PrismaService) {}

  async parentExists(parentGrafoId: string, userId: string): Promise<boolean> {
    const parent = await this.prisma.grafosConhecimento.findFirst({
      where: { id: parentGrafoId, usuarioId: userId },
      select: { id: true },
    });
    return parent !== null;
  }

  async createSubgraph(
    userId: string,
    parentGrafoId: string,
    input: CreateSubgraphInput,
  ): Promise<{ grafoId: string; grafoRefNodeId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const filho = await this.createChildGraph(tx, userId, parentGrafoId, input);
      const refNode = await tx.nodeConhecimento.create({
        data: {
          grafoId: parentGrafoId,
          tipoNode: 'GRAFO_REF',
          referenciaId: filho.id,
          usuarioId: userId,
          posicaoX: input.posX ?? 0,
          posicaoY: input.posY ?? 0,
        },
      });
      return { grafoId: filho.id, grafoRefNodeId: refNode.referenciaId };
    });
  }

  private createChildGraph(
    tx: Prisma.TransactionClient,
    userId: string,
    parentGrafoId: string,
    input: CreateSubgraphInput,
  ): Promise<{ id: string }> {
    return tx.grafosConhecimento.create({
      data: {
        usuarioId: userId,
        nome: input.nome.trim() || 'Novo subgrafo',
        descricao: input.descricao ?? null,
        parentGrafoId,
        tipoRelacaoPai: input.tipoRelacao,
      },
      select: { id: true },
    });
  }
}
