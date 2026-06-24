import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { CreateDeckRepository } from '../../domain/ports/create-deck-repository';

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
      const baralhoNode = await tx.nodeConhecimento.create({
        data: { grafoId, tipoNode: 'BARALHO', referenciaId: baralho.id, usuarioId: userId },
      });
      for (const flashcardId of flashcardIds) {
        await this.linkFlashcard(tx, {
          userId,
          grafoId,
          baralhoNodeId: baralhoNode.id,
          flashcardId,
        });
      }
      return baralho.id;
    });
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
    const existing = await tx.nodeConhecimento.findFirst({
      where: { grafoId, usuarioId: userId, tipoNode: 'FLASHCARD', referenciaId: flashcardId },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await tx.nodeConhecimento.create({
      data: { grafoId, tipoNode: 'FLASHCARD', referenciaId: flashcardId, usuarioId: userId },
      select: { id: true },
    });
    return created.id;
  }
}
