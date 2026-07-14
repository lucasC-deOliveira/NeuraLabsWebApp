import { Injectable } from '@nestjs/common';
import { type Prisma, type TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  GraphDeletionExecution,
  GraphDeletionRepository,
} from '../../domain/ports/graph-deletion-repository';
import type {
  DeletableNode,
  NodeDeletionRepository,
} from '../../domain/ports/node-deletion-repository';
import type { GraphMember } from '../../domain/services/graph-deletion-plan';

type EntityDeleter = (tx: Prisma.TransactionClient, refId: string) => Promise<void>;

// Single adapter for both deletion ports: deleteGraph and deleteNode share the
// per-type entity removal (entityDeleters), so they live together here.
@Injectable()
export class PrismaGraphDeletionRepository
  implements GraphDeletionRepository, NodeDeletionRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async graphExists(grafoId: string, userId: string): Promise<boolean> {
    const g = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { id: true },
    });
    return g !== null;
  }

  async listMembers(grafoId: string, userId: string): Promise<GraphMember[]> {
    return this.prisma.nodeConhecimento.findMany({
      where: { grafoId, usuarioId: userId },
      select: { tipoNode: true, referenciaId: true },
    });
  }

  async existsInOtherGraph(
    userId: string,
    tipoNode: string,
    referenciaId: string,
    exceptGrafoId: string,
  ): Promise<boolean> {
    const count = await this.prisma.nodeConhecimento.count({
      where: {
        referenciaId,
        tipoNode: tipoNode as TipoNode,
        usuarioId: userId,
        grafoId: { not: exceptGrafoId },
      },
    });
    return count > 0;
  }

  async deleteGraph(userId: string, grafoId: string, plan: GraphDeletionExecution): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Detach kept flashcards from dying concepts so the cascade spares them.
      if (plan.detachConceptIds.length > 0) {
        await tx.flashcard.updateMany({
          where: { conceitoId: { in: plan.detachConceptIds }, usuarioId: userId },
          data: { conceitoId: null },
        });
      }
      for (const member of plan.ordered) {
        await this.deleteEntity(tx, member.tipoNode, member.referenciaId);
      }
      // Deleting the graph cascades to its links (NodeConhecimento) and edges.
      await tx.grafosConhecimento.delete({ where: { id: grafoId } });
    });
  }

  async findNode(userId: string, refId: string, grafoId?: string): Promise<DeletableNode | null> {
    const node = await this.prisma.nodeConhecimento.findFirst({
      where: { referenciaId: refId, usuarioId: userId, ...(grafoId ? { grafoId } : {}) },
      select: { id: true, tipoNode: true, referenciaId: true },
    });
    return node ?? null;
  }

  async findConnectedNodes(userId: string, nodeId: string): Promise<DeletableNode[]> {
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: { OR: [{ nodeOrigemId: nodeId }, { nodeDestinoId: nodeId }] },
      include: { nodeOrigem: true, nodeDestino: true },
    });
    const ids = new Set<string>();
    for (const e of edges) {
      const neighbor = e.nodeOrigemId === nodeId ? e.nodeDestino : e.nodeOrigem;
      if (neighbor && neighbor.usuarioId === userId && neighbor.id !== nodeId) ids.add(neighbor.id);
    }
    return this.prisma.nodeConhecimento.findMany({
      where: { id: { in: [...ids] }, usuarioId: userId },
      select: { id: true, tipoNode: true, referenciaId: true },
    });
  }

  async deleteNodes(nodes: DeletableNode[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const n of nodes) {
        await tx.conhecimentoAresta.deleteMany({
          where: { OR: [{ nodeOrigemId: n.id }, { nodeDestinoId: n.id }] },
        });
        await tx.desempenhoNo.deleteMany({ where: { nodeId: n.id } });
        await this.deleteEntity(tx, n.tipoNode, n.referenciaId);
        await tx.nodeConhecimento.delete({ where: { id: n.id } });
      }
    });
  }

  private async deleteEntity(
    tx: Prisma.TransactionClient,
    tipo: string,
    refId: string,
  ): Promise<void> {
    await this.entityDeleters[tipo]?.(tx, refId);
  }

  // Per-type entity removal. Structural deletes first null out children's FK so
  // their rows survive; GRAFO_REF only detaches the referenced graph's parent.
  private readonly entityDeleters: Record<string, EntityDeleter> = {
    FLASHCARD: async (tx, refId) => {
      await tx.revisaoFlashcard.deleteMany({ where: { flashcardId: refId } });
      await tx.aprendizadoFlashcard.deleteMany({ where: { flashcardId: refId } });
      await tx.flashcard.delete({ where: { id: refId } });
    },
    NOTA: async (tx, refId) => {
      await tx.nota.delete({ where: { id: refId } });
    },
    ASSUNTO: async (tx, refId) => {
      await tx.topico.updateMany({ where: { assuntoId: refId }, data: { assuntoId: null } });
      await tx.assunto.delete({ where: { id: refId } });
    },
    TOPICO: async (tx, refId) => {
      await tx.conceito.updateMany({ where: { topicoId: refId }, data: { topicoId: null } });
      await tx.topico.delete({ where: { id: refId } });
    },
    CONCEITO: async (tx, refId) => {
      await tx.conceito.delete({ where: { id: refId } });
    },
    TEXTO_BRUTO: async (tx, refId) => {
      await tx.textoBruto.delete({ where: { id: refId } });
    },
    BARALHO: async (tx, refId) => {
      await tx.baralho.delete({ where: { id: refId } });
    },
    QUESTION: async (tx, refId) => {
      await tx.questao.delete({ where: { id: refId } });
    },
    PROVA: async (tx, refId) => {
      await tx.prova.delete({ where: { id: refId } });
    },
    GRAFO_REF: async (tx, refId) => {
      await tx.grafosConhecimento.updateMany({
        where: { id: refId },
        data: { parentGrafoId: null, tipoRelacaoPai: null },
      });
    },
  };
}
