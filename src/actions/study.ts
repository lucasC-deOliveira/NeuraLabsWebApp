"use server";

import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { FlashcardData } from "@/types";
import { applyInterleaving } from "@/lib/interleaving";

// Re-export from infrastructure layer
import {
  startStudySession as libStartStudySession,
  endStudySession as libEndStudySession,
  getCardsForStudySession,
  getNewCardsForStudy,
  submitReview as libSubmitReview,
} from "@/modules/study/infra/prisma-estudo-repository";

const MAX_CARDS_PER_SESSION = 15;
const MAX_NEW_CARDS_PER_SESSION = 5;

export async function startStudySession(): Promise<{
  sessionId: string;
  cards: FlashcardData[];
}> {
  const userId = await requireUserId();
  const sessionId = await libStartStudySession(userId);

  const [dueCards, newCards] = await Promise.all([
    getCardsForStudySession(userId),
    getNewCardsForStudy(userId, MAX_NEW_CARDS_PER_SESSION),
  ]);

  const combined = [...dueCards, ...newCards].slice(0, MAX_CARDS_PER_SESSION);
  const interleaved = applyInterleaving(combined);

  return { sessionId, cards: interleaved };
}

export async function submitCardReview(data: {
  flashcardId: string;
  respostaUsuario: string;
  acertou: boolean;
  nivelConfianca: number;
  tipoErro?: string;
  tempoResposta?: number;
}): Promise<{ success: boolean }> {
  const userId = await requireUserId();

  const activeSession = await prisma.sessaoEstudo.findFirst({
    where: {
      usuarioId: userId,
      dataFim: null,
    },
    orderBy: { dataInicio: "desc" },
    select: { id: true },
  });

  if (!activeSession) {
    throw new Error("No active study session. Call startStudySession() first.");
  }

  await libSubmitReview({
    flashcardId: data.flashcardId,
    sessaoId: activeSession.id,
    respostaUsuario: data.respostaUsuario,
    acertou: data.acertou,
    nivelConfianca: data.nivelConfianca,
    tipoErro: data.tipoErro,
    tempoResposta: data.tempoResposta,
  });

  return { success: true };
}

export async function endStudySession(sessionId: string): Promise<{ success: boolean }> {
  await libEndStudySession(sessionId);
  revalidatePath("/study", "layout");
  return { success: true };
}

export async function getStudySessionHistory(
  userId?: string,
): Promise<
  Array<{
    id: string;
    dataInicio: Date;
    dataFim: Date | null;
    totalReviews: number;
    correctCount: number;
    incorrectCount: number;
    avgConfidence: number;
  }>
> {
  if (!userId) {
    userId = await requireUserId();
  }

  const sessions = await prisma.sessaoEstudo.findMany({
    where: { usuarioId: userId },
    include: {
      _count: {
        select: { revisoes: true },
      },
      revisoes: {
        select: {
          acertou: true,
          nivelConfianca: true,
        },
      },
    },
    orderBy: { dataInicio: "desc" },
    take: 20,
  });

  return sessions.map((session: typeof sessions[number]) => {
    const reviews = session.revisoes;
    const correctCount = reviews.filter((r) => r.acertou).length;
    const incorrectCount = reviews.filter((r) => !r.acertou).length;
    const avgConfidence =
      reviews.length > 0
        ? reviews.reduce((sum: number, r) => sum + r.nivelConfianca, 0) / reviews.length
        : 0;

    return {
      id: session.id,
      dataInicio: session.dataInicio,
      dataFim: session.dataFim,
      totalReviews: session._count.revisoes,
      correctCount,
      incorrectCount,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
    };
  });
}
