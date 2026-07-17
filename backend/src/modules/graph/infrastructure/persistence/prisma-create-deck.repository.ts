import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { CreateDeckRepository } from '../../domain/ports/create-deck-repository';
import { containNode, createContainedNode } from './node-containment';

@Injectable()
export class PrismaCreateDeckRepository implements CreateDeckRepository {
  constructor(private readonly prisma: PrismaService) {}

  async graphExists(grafoId: string, userId: string): Promise<boolean> {
    const g = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { id: true },
    });
    return g !== null;
  }

  async allFlashcardsOwned(userId: string, flashcardIds: string[]): Promise<boolean> {
    const count = await this.prisma.flashcard.count({
      where: { id: { in: flashcardIds }, usuarioId: userId },
    });
    return count === flashcardIds.length;
  }

  async createDeck(
    userId: string,
    grafoId: string,
    titulo: string,
    flashcardIds: string[],
  ): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const baralho = await this.createDeckRow(tx, userId, titulo, flashcardIds);
      const baralhoNodeId = await createContainedNode(tx, {
        usuarioId: userId,
        grafoId,
        tipoNode: 'BARALHO',
        referenciaId: baralho.id,
      });
      await this.linkFlashcards(tx, { userId, grafoId, baralhoNodeId }, flashcardIds);
      return baralho.id;
    });
  }

  private async linkFlashcards(
    tx: Prisma.TransactionClient,
    ctx: { userId: string; grafoId: string; baralhoNodeId: string },
    flashcardIds: string[],
  ): Promise<void> {
    for (const flashcardId of flashcardIds) {
      await this.linkFlashcard(tx, { ...ctx, flashcardId });
    }
  }

  private createDeckRow(
    tx: Prisma.TransactionClient,
    userId: string,
    titulo: string,
    flashcardIds: string[],
  ): Promise<{ id: string }> {
    return tx.baralho.create({
      data: {
        titulo,
        usuarioId: userId,
        dataCriacao: new Date(),
        flashcards: flashcardIds.length
          ? { connect: flashcardIds.map((id) => ({ id })) }
          : undefined,
      },
      select: { id: true },
    });
  }

  // Ensures the flashcard has a node in the graph, then a CONTEM edge from the deck.
  private async linkFlashcard(
    tx: Prisma.TransactionClient,
    args: { userId: string; grafoId: string; baralhoNodeId: string; flashcardId: string },
  ): Promise<void> {
    const fcNodeId = await this.ensureFlashcardNode(
      tx,
      args.grafoId,
      args.userId,
      args.flashcardId,
    );
    await tx.conhecimentoAresta.create({
      data: {
        grafoId: args.grafoId,
        nodeOrigemId: args.baralhoNodeId,
        nodeDestinoId: fcNodeId,
        tipoRelacao: 'CONTEM',
        peso: 1,
      },
    });
  }

  private async ensureFlashcardNode(
    tx: Prisma.TransactionClient,
    grafoId: string,
    userId: string,
    flashcardId: string,
  ): Promise<string> {
    const no = {
      usuarioId: userId,
      grafoId,
      tipoNode: 'FLASHCARD' as const,
      referenciaId: flashcardId,
    };
    const existing = await tx.nodeConhecimento.findFirst({ where: no, select: { id: true } });
    // A contenção pode faltar (nó de um caminho antigo); garanti-la é idempotente.
    if (existing) {
      await containNode(tx, grafoId, existing.id);
      return existing.id;
    }
    return createContainedNode(tx, no);
  }
}
