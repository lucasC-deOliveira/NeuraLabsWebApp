"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createReviewSchedule } from "@/lib/spaced-repetition";
import type { FlashcardData, SpacedRepetitionData } from "@/types";
import { Prisma } from "@/generated/prisma/client";

// ==========================================
// Helpers
// ==========================================

async function resolveUserId(): Promise<string> {
  const user = await prisma.usuario.findFirst({ select: { id: true } });
  if (!user) {
    throw new Error("No user configured -- set up auth");
  }
  return user.id;
}

// Create or reuse a knowledge node for a concept, then create a flashcard node.
async function ensureKnowledgeNodes(tx: Prisma.TransactionClient, conceitoId: string, flashcardId: string) {
  // Upsert concept node
  const existing = await tx.nodeConhecimento.findFirst({
    where: { tipoNode: "CONCEITO", referenciaId: conceitoId },
  });

  if (!existing) {
    await tx.nodeConhecimento.create({
      data: { tipoNode: "CONCEITO", referenciaId: conceitoId },
    });
  }

  // Create flashcard node (should be unique per flashcard)
  await tx.nodeConhecimento.create({
    data: {
      tipoNode: "FLASHCARD",
      referenciaId: flashcardId,
    },
  });
}

// ==========================================
// CRUD Actions
// ==========================================

export async function createFlashcard(data: {
  pergunta: string;
  resposta: string;
  conceitoId: string;
}): Promise<{ flashcardId: string }> {
  const userId = await resolveUserId();

  const flashcard = await prisma.$transaction(async (tx) => {
    const created = await tx.flashcard.create({
      data: {
        pergunta: data.pergunta,
        resposta: data.resposta,
        conceitoId: data.conceitoId,
        usuarioId: userId,
      },
    });

    // Initial spaced-repetition record
    const schedule = createReviewSchedule(3); // default neutral quality
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + schedule.interval);

    await tx.aprendizadoFlashcard.create({
      data: {
        flashcardId: created.id,
        usuarioId: userId,
        dificuldade: schedule.ease > 0 ? Math.max(1, Math.round((5 - schedule.ease) * 2)) : 5,
        intervalo: schedule.interval,
        proximaRevisao: nextReview,
        ultimaRevisao: new Date(),
        estagioAprendizado: schedule.stage,
      },
    });

    // Knowledge graph nodes
    await ensureKnowledgeNodes(tx, data.conceitoId, created.id);

    return created;
  });

  revalidatePath("/flashcards");
  return { flashcardId: flashcard.id };
}

export async function updateFlashcard(
  id: string,
  data: { pergunta?: string; resposta?: string },
): Promise<{ success: boolean }> {
  await prisma.flashcard.update({
    where: { id },
    data: {
      ...(data.pergunta !== undefined && { pergunta: data.pergunta }),
      ...(data.resposta !== undefined && { resposta: data.resposta }),
    },
  });

  revalidatePath("/flashcards");
  return { success: true };
}

export async function deleteFlashcard(id: string): Promise<{ success: boolean }> {
  await prisma.flashcard.delete({ where: { id } });

  revalidatePath("/flashcards");
  return { success: true };
}

export async function getFlashcards(options?: {
  conceptId?: string;
  topicId?: string;
}): Promise<
  Array<
    FlashcardData & {
      spacedRepetition: SpacedRepetitionData | null;
      dataCriacao: Date;
    }
  >
> {
  const whereClause: Record<string, unknown> = {};

  if (options?.conceptId) {
    whereClause.conceitoId = options.conceptId;
  }

  if (options?.topicId) {
    whereClause.conceito = { topicoId: options.topicId };
  }

  const records = await prisma.flashcard.findMany({
    where: whereClause,
    include: {
      conceito: true,
      aprendizado: {
        take: 1,
        orderBy: { ultimaRevisao: "desc" },
      },
    },
    orderBy: { dataCriacao: "desc" },
  });

  return records.map((fc: typeof records[number]) => ({
    id: fc.id,
    pergunta: fc.pergunta,
    resposta: fc.resposta,
    conceito: fc.conceito.nome,
    dataCriacao: fc.dataCriacao,
    spacedRepetition: fc.aprendizado[0]
      ? {
          dificuldade: fc.aprendizado[0].dificuldade,
          intervalo: fc.aprendizado[0].intervalo,
          proximaRevisao: fc.aprendizado[0].proximaRevisao,
          ultimaRevisao: fc.aprendizado[0].ultimaRevisao,
          estagioAprendizado: fc.aprendizado[0].estagioAprendizado,
        }
      : null,
  }));
}

export async function getFlashcardById(id: string): Promise<
  FlashcardData & {
    spacedRepetition: SpacedRepetitionData | null;
    dataCriacao: Date;
  } | null
> {
  const record = await prisma.flashcard.findUnique({
    where: { id },
    include: {
      conceito: true,
      aprendizado: {
        take: 1,
        orderBy: { ultimaRevisao: "desc" },
      },
    },
  });

  if (!record) return null;

  return {
    id: record.id,
    pergunta: record.pergunta,
    resposta: record.resposta,
    conceito: record.conceito.nome,
    dataCriacao: record.dataCriacao,
    spacedRepetition: record.aprendizado[0]
      ? {
          dificuldade: record.aprendizado[0].dificuldade,
          intervalo: record.aprendizado[0].intervalo,
          proximaRevisao: record.aprendizado[0].proximaRevisao,
          ultimaRevisao: record.aprendizado[0].ultimaRevisao,
          estagioAprendizado: record.aprendizado[0].estagioAprendizado,
        }
      : null,
  };
}
