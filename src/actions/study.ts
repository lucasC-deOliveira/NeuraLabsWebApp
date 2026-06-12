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

// Inicia o estudo de um baralho com repetição espaçada: só entram os flashcards
// do deck que PRECISAM ser revisados (nunca estudados ou já vencidos). A sessão
// termina quando todos esses forem respondidos.
export async function startDeckStudy(baralhoId: string): Promise<{
  sessionId: string;
  titulo: string;
  cards: FlashcardData[];
  totalNoDeck: number;
} | null> {
  const userId = await requireUserId();
  const baralho = await prisma.baralho.findFirst({
    where: { id: baralhoId, usuarioId: userId },
    include: {
      flashcards: {
        include: {
          conceito: { select: { nome: true } },
          aprendizado: { where: { usuarioId: userId } },
        },
        orderBy: { dataCriacao: "asc" },
      },
    },
  });
  if (!baralho) return null;

  const now = new Date();
  // só os que precisam de revisão: sem agendamento (novos) ou já vencidos
  const dueCards = baralho.flashcards.filter((fc) => {
    const ap = fc.aprendizado[0];
    return !ap || ap.proximaRevisao <= now;
  });

  const cards: FlashcardData[] = dueCards.map((fc) => ({
    id: fc.id,
    pergunta: fc.pergunta,
    resposta: fc.resposta,
    conceito: fc.conceito?.nome ?? null,
  }));

  const sessionId = await libStartStudySession(userId);
  return { sessionId, titulo: baralho.titulo, cards, totalNoDeck: baralho.flashcards.length };
}

// Carrega um único flashcard para estudo avulso (ex.: a partir do grafo).
// Inclui o status de repetição espaçada: só pode ser estudado se estiver vencido
// (novo ou proximaRevisao <= agora).
export async function getFlashcardForStudy(flashcardId: string): Promise<{
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string | null;
  due: boolean;
  proximaRevisao: string | null;
} | null> {
  const userId = await requireUserId();
  const fc = await prisma.flashcard.findFirst({
    where: { id: flashcardId, usuarioId: userId },
    include: {
      conceito: { select: { nome: true } },
      aprendizado: { where: { usuarioId: userId } },
    },
  });
  if (!fc) return null;
  const ap = fc.aprendizado[0];
  const due = !ap || ap.proximaRevisao <= new Date();
  return {
    id: fc.id,
    pergunta: fc.pergunta,
    resposta: fc.resposta,
    conceito: fc.conceito?.nome ?? null,
    due,
    proximaRevisao: ap ? ap.proximaRevisao.toISOString() : null,
  };
}

// Inicia o estudo de UM flashcard avulso (ex.: a partir do grafo): cria a
// sessão de estudo no momento em que o usuário clica em "Estudar" e a mantém
// aberta até ele terminar (a sessão é finalizada por finalizeStudySession).
// Só cria a sessão se o card estiver vencido (repetição espaçada).
export async function startSingleCardStudy(flashcardId: string): Promise<{
  sessionId: string | null;
  card: { id: string; pergunta: string; resposta: string; conceito: string | null };
  due: boolean;
  proximaRevisao: string | null;
} | null> {
  const userId = await requireUserId();
  const fc = await prisma.flashcard.findFirst({
    where: { id: flashcardId, usuarioId: userId },
    include: {
      conceito: { select: { nome: true } },
      aprendizado: { where: { usuarioId: userId } },
    },
  });
  if (!fc) return null;

  const ap = fc.aprendizado[0];
  const due = !ap || ap.proximaRevisao <= new Date();
  const card = {
    id: fc.id,
    pergunta: fc.pergunta,
    resposta: fc.resposta,
    conceito: fc.conceito?.nome ?? null,
  };
  const proximaRevisao = ap ? ap.proximaRevisao.toISOString() : null;

  // só abre uma sessão quando há de fato o que estudar
  const sessionId = due ? await libStartStudySession(userId) : null;
  return { sessionId, card, due, proximaRevisao };
}

// Finaliza uma sessão de estudo: se ela não teve nenhuma revisão (abandonada),
// é apagada para não poluir o histórico; caso contrário, é encerrada (dataFim).
export async function finalizeStudySession(sessionId: string): Promise<{ success: boolean }> {
  const userId = await requireUserId();
  const session = await prisma.sessaoEstudo.findFirst({
    where: { id: sessionId, usuarioId: userId },
    select: { id: true, dataFim: true, _count: { select: { revisoes: true } } },
  });
  if (!session) return { success: false };

  if (session._count.revisoes === 0) {
    await prisma.sessaoEstudo.delete({ where: { id: sessionId } });
  } else if (!session.dataFim) {
    await prisma.sessaoEstudo.update({ where: { id: sessionId }, data: { dataFim: new Date() } });
  }
  revalidatePath("/study", "layout");
  return { success: true };
}

// Registra a revisão de um único flashcard (cria e encerra uma sessão pontual).
// Mantido para compatibilidade; o estudo via modal agora usa
// startSingleCardStudy + submitCardReview + finalizeStudySession.
export async function reviewSingleCard(data: {
  flashcardId: string;
  acertou: boolean;
  nivelConfianca: number;
  respostaUsuario?: string;
  tempoResposta?: number;
}): Promise<{ success: boolean }> {
  const userId = await requireUserId();

  const fc = await prisma.flashcard.findFirst({
    where: { id: data.flashcardId, usuarioId: userId },
    select: { id: true, aprendizado: { where: { usuarioId: userId }, select: { proximaRevisao: true } } },
  });
  if (!fc) throw new Error("Flashcard não encontrado ou não pertence ao usuário");

  // repetição espaçada: só revisa se estiver vencido (novo ou prazo passou)
  const ap = fc.aprendizado[0];
  if (ap && ap.proximaRevisao > new Date()) {
    throw new Error("Este flashcard ainda não está disponível para revisão.");
  }

  const sessionId = await libStartStudySession(userId);
  await libSubmitReview({
    flashcardId: data.flashcardId,
    sessaoId: sessionId,
    respostaUsuario: data.respostaUsuario ?? "",
    acertou: data.acertou,
    nivelConfianca: data.nivelConfianca,
    tempoResposta: data.tempoResposta,
  });
  await libEndStudySession(sessionId);

  return { success: true };
}

export async function submitCardReview(data: {
  flashcardId: string;
  respostaUsuario: string;
  acertou: boolean;
  nivelConfianca: number;
  tipoErro?: string;
  tempoResposta?: number;
  // sessão alvo (estudo de card avulso); se omitido, usa a sessão aberta mais recente
  sessaoId?: string;
}): Promise<{ success: boolean }> {
  const userId = await requireUserId();

  // sessão alvo: a informada (validada por dono) ou a aberta mais recente
  const activeSession = await prisma.sessaoEstudo.findFirst({
    where: data.sessaoId
      ? { id: data.sessaoId, usuarioId: userId }
      : { usuarioId: userId, dataFim: null },
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
