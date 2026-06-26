import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ConceitoRef, FlashcardRepository } from '../../domain/ports/flashcard-repository';
import type {
  CreateFlashcardInput,
  PreviewCard,
  UpdateFlashcardPatch,
} from '../../domain/flashcard-views';

@Injectable()
export class PrismaFlashcardRepository implements FlashcardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateFlashcardInput): Promise<string> {
    const { id } = await this.prisma.flashcard.create({
      data: {
        pergunta: input.pergunta,
        resposta: input.resposta,
        conceitoId: input.conceitoId ?? null,
        usuarioId: userId,
        tipo: (input.tipo ?? null) as Prisma.FlashcardUncheckedCreateInput['tipo'],
      },
      select: { id: true },
    });
    return id;
  }

  async update(userId: string, id: string, patch: UpdateFlashcardPatch): Promise<void> {
    await this.prisma.flashcard.updateMany({
      where: { id, usuarioId: userId },
      data: toUpdateData(patch),
    });
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.prisma.flashcard.deleteMany({ where: { id, usuarioId: userId } });
  }

  async deleteAllWithGraph(userId: string): Promise<number> {
    const flashcards = await this.prisma.flashcard.findMany({
      where: { usuarioId: userId },
      select: { id: true },
    });
    await this.prisma.$transaction(async (tx) => {
      for (const fc of flashcards) await removeGraphNode(tx, fc.id);
      await tx.flashcard.deleteMany({ where: { usuarioId: userId } });
    });
    return flashcards.length;
  }

  saveMany(userId: string, cards: PreviewCard[]): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      for (const c of cards) {
        await tx.flashcard.create({
          data: {
            pergunta: c.pergunta,
            resposta: c.resposta,
            conceitoId: c.conceitoId,
            usuarioId: userId,
          },
        });
      }
      return cards.length;
    });
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
}

function toUpdateData(patch: UpdateFlashcardPatch): Prisma.FlashcardUncheckedUpdateInput {
  const data: Prisma.FlashcardUncheckedUpdateInput = {};
  if (patch.pergunta !== undefined) data.pergunta = patch.pergunta;
  if (patch.resposta !== undefined) data.resposta = patch.resposta;
  if (patch.tipo !== undefined)
    data.tipo = (patch.tipo ?? null) as Prisma.FlashcardUncheckedUpdateInput['tipo'];
  return data;
}

// Removes the FLASHCARD graph node (and its edges) that mirrors a flashcard.
async function removeGraphNode(tx: Prisma.TransactionClient, flashcardId: string): Promise<void> {
  const node = await tx.nodeConhecimento.findFirst({
    where: { tipoNode: 'FLASHCARD', referenciaId: flashcardId },
    select: { id: true },
  });
  if (!node) return;
  await tx.conhecimentoAresta.deleteMany({
    where: { OR: [{ nodeOrigemId: node.id }, { nodeDestinoId: node.id }] },
  });
  await tx.nodeConhecimento.delete({ where: { id: node.id } });
}
