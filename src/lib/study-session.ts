// ==========================================
// Study Session Logic
// Thin wrapper over Prisma — algorithm in spaced-repetition.ts
// ==========================================

import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  calculateNextInterval,
  createReviewSchedule,
  mapQualityToScore,
} from "./spaced-repetition";
import { classifyError } from "./errors";

export type { FlashcardData } from "@/types";

/**
 * Gets flashcards due for review (proximaRevisao <= now),
 * ordered by stage ascending then proximaRevisao ascending.
 */
export async function getCardsForStudySession(
  userId: string,
) {
  const now = new Date();

  const records = await prisma.aprendizadoFlashcard.findMany({
    where: {
      usuarioId: userId,
      proximaRevisao: { lte: now },
    },
    include: {
      flashcard: {
        include: {
          conceito: true,
        },
      },
    },
    orderBy: [
      { estagioAprendizado: "asc" },
      { proximaRevisao: "asc" },
    ],
  });

  return records.map((r: typeof records[number]) => ({
    id: r.flashcard.id,
    pergunta: r.flashcard.pergunta,
    resposta: r.flashcard.resposta,
    conceito: r.flashcard.conceito.nome,
    spacedRepetition: {
      dificuldade: r.dificuldade,
      intervalo: r.intervalo,
      proximaRevisao: r.proximaRevisao,
      ultimaRevisao: r.ultimaRevisao,
      estagioAprendizado: r.estagioAprendizado,
    },
  }));
}

/**
 * Gets flashcards without any review history (new cards).
 */
export async function getNewCardsForStudy(
  userId: string,
  limit: number = 10,
) {
  const records = await prisma.flashcard.findMany({
    where: {
      usuarioId: userId,
      aprendizado: { none: {} },
    },
    include: {
      conceito: { select: { nome: true } },
    },
    take: limit,
  });

  return records.map((fc: typeof records[number]) => ({
    id: fc.id,
    pergunta: fc.pergunta,
    resposta: fc.resposta,
    conceito: fc.conceito.nome,
  }));
}

/**
 * Submits a review: saves the review record and updates spaced repetition data.
 */
export async function submitReview(reviewData: {
  flashcardId: string;
  sessaoId: string;
  respostaUsuario: string;
  acertou: boolean;
  nivelConfianca: number;
  tipoErro?: string;
  tempoResposta?: number;
}) {
  const {
    flashcardId,
    sessaoId,
    respostaUsuario,
    acertou,
    nivelConfianca,
    tempoResposta,
  } = reviewData;

  // Classify error if the answer was wrong
  let tipoErro = reviewData.tipoErro;
  if (!acertou && !tipoErro && respostaUsuario) {
    const correctRecord = await prisma.flashcard.findUnique({
      where: { id: flashcardId },
      select: { resposta: true },
    });
    if (correctRecord) {
      const classification = classifyError(respostaUsuario, correctRecord.resposta);
      tipoErro = classification.tipo;
    }
  }

  const quality = mapQualityToScore(acertou, nivelConfianca);

  // All DB writes in a single transaction to keep review + SR data consistent
  await prisma.$transaction(async (tx) => {
    const flashcard = await tx.flashcard.findUnique({
      where: { id: flashcardId },
      select: { usuarioId: true },
    });

    if (!flashcard) throw new Error("Flashcard not found");

    // Save the review record
    await tx.revisaoFlashcard.create({
      data: {
        flashcardId,
        sessaoId,
        respostaUsuario,
        acertou,
        nivelConfianca,
        tipoErro,
        tempoResposta,
      },
    });

    const now = new Date();

    // Find or create the spaced-repetition record
    const existing = await tx.aprendizadoFlashcard.findFirst({
      where: { flashcardId, usuarioId: flashcard.usuarioId },
    });

    if (!existing) {
      // First review — create initial schedule
      const schedule = createReviewSchedule(quality);
      const nextReview = new Date(now);
      nextReview.setDate(nextReview.getDate() + schedule.interval);

      await tx.aprendizadoFlashcard.create({
        data: {
          flashcardId,
          usuarioId: flashcard.usuarioId,
          dificuldade: Math.max(1, 10 - quality),
          intervalo: schedule.interval,
          proximaRevisao: nextReview,
          ultimaRevisao: now,
          estagioAprendizado: schedule.stage,
        },
      });
    } else {
      // Update using SM-2
      const result = calculateNextInterval(
        // Derive ease from stored difficulty: ease = (11 - dificuldade) / 3
        // Default fallback is 2.5
        (11 - existing.dificuldade) / 3,
        existing.intervalo,
        quality,
      );

      const nextReview = new Date(now);
      nextReview.setDate(nextReview.getDate() + result.newInterval);

      await tx.aprendizadoFlashcard.update({
        where: {
          flashcardId_usuarioId: {
            flashcardId,
            usuarioId: flashcard.usuarioId,
          },
        },
        data: {
          dificuldade: Math.max(1, Math.min(10, 10 - quality * 2)),
          intervalo: result.newInterval,
          proximaRevisao: nextReview,
          ultimaRevisao: now,
          estagioAprendizado: result.newStage,
        },
      });
    }
  });
}

/**
 * Creates a new study session for a user and returns the session ID.
 */
export async function startStudySession(userId: string): Promise<string> {
  const session = await prisma.sessaoEstudo.create({
    data: { usuarioId: userId },
    select: { id: true },
  });
  return session.id;
}

/**
 * Ends a study session by setting dataFim.
 */
export async function endStudySession(sessionId: string): Promise<void> {
  await prisma.sessaoEstudo.update({
    where: { id: sessionId },
    data: { dataFim: new Date() },
  });
}
