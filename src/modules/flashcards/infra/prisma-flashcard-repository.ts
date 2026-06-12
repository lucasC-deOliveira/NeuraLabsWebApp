import { prisma } from "@/lib/prisma";
import { Flashcard } from "../domain/entities/flashcard";
import { FlashcardRepository } from "../domain/repositories/flashcard-repository";
import { SpacedRepetitionData } from "../domain/value-objects/flashcard-spaced-data";

export class PrismaFlashcardRepository implements FlashcardRepository {
  async save(flashcard: Flashcard): Promise<void> {
    await prisma.flashcard.upsert({
      where: { id: flashcard.id },
      create: {
        id: flashcard.id,
        usuarioId: flashcard.userId,
        pergunta: flashcard.pergunta,
        resposta: flashcard.resposta,
        conceitoId: flashcard.conceitoId,
      },
      update: {
        pergunta: flashcard.pergunta,
        resposta: flashcard.resposta,
      },
    });

    if (flashcard.spacedRepetition) {
      await prisma.aprendizadoFlashcard.upsert({
        where: {
          flashcardId_usuarioId: {
            flashcardId: flashcard.id,
            usuarioId: flashcard.userId,
          },
        },
        create: {
          flashcardId: flashcard.id,
          usuarioId: flashcard.userId,
          dificuldade: flashcard.spacedRepetition.dificuldade,
          intervalo: flashcard.spacedRepetition.intervalo,
          proximaRevisao: flashcard.spacedRepetition.proximaRevisao,
          ultimaRevisao: flashcard.spacedRepetition.ultimaRevisao,
          estagioAprendizado: flashcard.spacedRepetition.estagioAprendizado,
        },
        update: {
          dificuldade: flashcard.spacedRepetition.dificuldade,
          intervalo: flashcard.spacedRepetition.intervalo,
          proximaRevisao: flashcard.spacedRepetition.proximaRevisao,
          ultimaRevisao: flashcard.spacedRepetition.ultimaRevisao,
          estagioAprendizado: flashcard.spacedRepetition.estagioAprendizado,
        },
      });
    }
  }

  async findById(id: string): Promise<Flashcard | null> {
    const record = await prisma.flashcard.findUnique({
      where: { id },
      include: {
        conceito: { select: { nome: true } },
        aprendizado: {
          take: 1,
          orderBy: { ultimaRevisao: "desc" },
        },
      },
    });

    if (!record) return null;

    const sr: SpacedRepetitionData | null = record.aprendizado[0]
      ? SpacedRepetitionData.create(
          record.aprendizado[0].dificuldade,
          record.aprendizado[0].intervalo,
          record.aprendizado[0].proximaRevisao,
          record.aprendizado[0].ultimaRevisao,
          record.aprendizado[0].estagioAprendizado,
        )
      : null;

    return Flashcard.restore({
      id: record.id,
      userId: record.usuarioId,
      pergunta: record.pergunta,
      resposta: record.resposta,
      conceitoId: record.conceitoId,
      conceitoNome: record.conceito?.nome ?? null,
      spacedRepetition: sr,
      dataCriacao: record.dataCriacao,
    });
  }

  async findAllByUserId(
    userId: string,
    options?: { conceptId?: string; topicId?: string },
  ): Promise<Flashcard[]> {
    const whereClause: Record<string, unknown> = {};
    if (options?.conceptId) {
      whereClause.conceitoId = options.conceptId;
    }
    if (options?.topicId) {
      whereClause.conceito = { topicoId: options.topicId };
    }

    const records = await prisma.flashcard.findMany({
      where: { ...whereClause, usuarioId: userId },
      include: {
        conceito: { select: { nome: true } },
        aprendizado: {
          take: 1,
          orderBy: { ultimaRevisao: "desc" },
        },
      },
      orderBy: { dataCriacao: "desc" },
    });

    return records.map((fc) => {
      const sr: SpacedRepetitionData | null = fc.aprendizado[0]
        ? SpacedRepetitionData.create(
            fc.aprendizado[0].dificuldade,
            fc.aprendizado[0].intervalo,
            fc.aprendizado[0].proximaRevisao,
            fc.aprendizado[0].ultimaRevisao,
            fc.aprendizado[0].estagioAprendizado,
          )
        : null;

      return Flashcard.restore({
        id: fc.id,
        userId: fc.usuarioId,
        pergunta: fc.pergunta,
        resposta: fc.resposta,
        conceitoId: fc.conceitoId,
        conceitoNome: fc.conceito?.nome ?? null,
        spacedRepetition: sr,
        dataCriacao: fc.dataCriacao,
      });
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.flashcard.delete({ where: { id } });
  }
}
