"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import {
  getCreateFlashcardUseCaseWithDeps,
  getListFlashcardsUseCase,
  getUpdateFlashcardUseCase,
  getDeleteFlashcardUseCase,
} from "@/modules/flashcards/adapters/flashcard-composer";
import type {
  KnowledgeNodeService,
  SpacedRepetitionService,
} from "@/modules/flashcards/application/use-cases/create-flashcard.use-case";

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

// Knowledge graph service for flashcard creation
function createKnowledgeNodeService(userId: string): KnowledgeNodeService {
  return {
    async ensureFlashcardNodes(conceitoId: string, flashcardId: string) {
      const existing = await prisma.nodeConhecimento.findFirst({
        where: { tipoNode: "CONCEITO", referenciaId: conceitoId, usuarioId: userId },
      });

      if (!existing) {
        await prisma.nodeConhecimento.create({
          data: { tipoNode: "CONCEITO", referenciaId: conceitoId, usuarioId: userId },
        });
      }

      await prisma.nodeConhecimento.create({
        data: { tipoNode: "FLASHCARD", referenciaId: flashcardId, usuarioId: userId },
      });
    },
  };
}

// Create SR service adapter from the pure functions in domain
const srService: SpacedRepetitionService = {
  createSchedule(quality: number) {
    if (quality < 3) {
      return { interval: 1, ease: 2.5, stage: 0 };
    }
    return { interval: 1, ease: 2.5, stage: 1 };
  },
  calculateNextInterval(previousEase: number, previousInterval: number, quality: number) {
    if (quality < 3) {
      return { newInterval: 1, newEase: previousEase, newStage: 0 };
    }
    const newEase = Math.max(
      1.3,
      previousEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    );
    let newInterval: number;
    if (previousInterval === 0) {
      newInterval = 1;
    } else if (previousInterval === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(previousInterval * newEase);
    }
    const newStage = Math.min(5, previousInterval >= 1 ? 5 : 1);
    return { newInterval, newEase, newStage };
  },
};

// ==========================================
// Flashcard Actions — delegates to use cases
// ==========================================

export async function createFlashcard(data: {
  pergunta: string;
  resposta: string;
  conceitoId: string;
}): Promise<{ flashcardId: string }> {
  const userId = await resolveUserId();

  // Fetch concept name
  const concept = await prisma.conceito.findUnique({
    where: { id: data.conceitoId },
    select: { nome: true },
  });
  if (!concept) throw new Error("Conceito não encontrado");

  const useCase = getCreateFlashcardUseCaseWithDeps(
    srService,
    createKnowledgeNodeService(userId),
  );

  const result = await useCase.execute({
    pergunta: data.pergunta,
    resposta: data.resposta,
    conceitoId: data.conceitoId,
    conceitoNome: concept.nome,
    userId,
  });

  revalidatePath("/flashcards");
  return { flashcardId: result.flashcardId };
}

export async function updateFlashcard(
  id: string,
  data: { pergunta?: string; resposta?: string },
): Promise<{ success: boolean }> {
  const useCase = getUpdateFlashcardUseCase();
  const result = await useCase.execute({
    id,
    pergunta: data.pergunta,
    resposta: data.resposta,
  });

  revalidatePath("/flashcards");
  return result;
}

export async function deleteFlashcard(id: string): Promise<{ success: boolean }> {
  const useCase = getDeleteFlashcardUseCase();
  await useCase.execute(id);

  revalidatePath("/flashcards");
  return { success: true };
}

export async function getFlashcards(options?: {
  conceptId?: string;
  topicId?: string;
}): Promise<
  Array<{
    id: string;
    pergunta: string;
    resposta: string;
    conceito: string;
    spacedRepetition: {
      dificuldade: number;
      intervalo: number;
      proximaRevisao: Date;
      ultimaRevisao: Date;
      estagioAprendizado: number;
    } | null;
    dataCriacao: Date;
  }>
> {
  const userId = await resolveUserId();
  const useCase = getListFlashcardsUseCase();

  return useCase.execute({
    userId,
    conceptId: options?.conceptId,
    topicId: options?.topicId,
  });
}

export async function getFlashcardById(id: string): Promise<{
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string;
  spacedRepetition: {
    dificuldade: number;
    intervalo: number;
    proximaRevisao: Date;
    ultimaRevisao: Date;
    estagioAprendizado: number;
  } | null;
  dataCriacao: Date;
} | null> {
  const useCase = getListFlashcardsUseCase();
  // List use case returns all, we need a GetById — for now fetch all and filter
  // This is a temporary approach; ideally we'd have a dedicated GetById use case
  const all = await useCase.execute({ userId: await resolveUserId() });
  return all.find((fc: typeof all[number]) => fc.id === id) ?? null;
}
