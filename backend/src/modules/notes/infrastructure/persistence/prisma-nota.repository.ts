import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ConceitoRef, NewFlashcard, NotaRepository } from '../../domain/ports/nota-repository';
import type { CreateNotaInput, FlashcardCreated } from '../../domain/note-views';

@Injectable()
export class PrismaNotaRepository implements NotaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createNota(userId: string, input: CreateNotaInput): Promise<string> {
    const conteudo = `# ${input.titulo}\n\n${input.conteudo}`;
    const { id } = await this.prisma.nota.create({
      data: {
        usuarioId: userId,
        titulo: input.titulo,
        conteudo,
        subtipo: (input.subtipo ?? null) as Prisma.NotaUncheckedCreateInput['subtipo'],
        tipoNota: input.tipoNota ?? 'PERMANENTE',
      },
      select: { id: true },
    });
    return id;
  }

  async deleteNota(userId: string, id: string): Promise<void> {
    await this.prisma.nota.deleteMany({ where: { id, usuarioId: userId } });
  }

  async deleteAll(userId: string): Promise<number> {
    const res = await this.prisma.nota.deleteMany({ where: { usuarioId: userId } });
    return res.count;
  }

  loadNotaContent(userId: string, notaId: string): Promise<{ conteudo: string } | null> {
    return this.prisma.nota.findFirst({
      where: { id: notaId, usuarioId: userId },
      select: { conteudo: true },
    });
  }

  loadConcepts(userId: string): Promise<ConceitoRef[]> {
    return this.prisma.conceito.findMany({
      where: { usuarioId: userId },
      select: { id: true, nome: true },
    });
  }

  createFlashcards(userId: string, cards: NewFlashcard[]): Promise<FlashcardCreated[]> {
    return this.prisma.$transaction((tx) =>
      Promise.all(cards.map((c) => createCard(tx, userId, c))),
    );
  }
}

function createCard(
  tx: Prisma.TransactionClient,
  userId: string,
  card: NewFlashcard,
): Promise<FlashcardCreated> {
  return tx.flashcard.create({
    data: {
      pergunta: card.pergunta,
      resposta: card.resposta,
      conceitoId: card.conceitoId,
      usuarioId: userId,
    },
    select: { id: true, pergunta: true },
  });
}
