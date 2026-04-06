"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getCreateNotaUseCaseWithConcepts,
  getGetNotaUseCase,
  getDeleteNotaUseCase,
  getGenerateFlashcardsFromNotaUseCaseWithConcepts,
} from "@/modules/notas/adapters/nota-composer";

// ==========================================
// Note Actions — delegates to use cases
// ==========================================

export async function createNota(
  rawText: string,
  titulo?: string,
): Promise<{ notaId: string; matchedConcepts: { term: string; conceito: string }[] }> {
  const useCase = await getCreateNotaUseCaseWithConcepts();
  const result = await useCase.execute({
    rawText,
    userId: await resolveUserId(),
    titulo,
  });

  revalidatePath("/notes");
  return {
    notaId: result.notaId,
    matchedConcepts: result.matchedConcepts.map((m) => ({
      term: m.term,
      conceito: m.conceitoId,
    })),
  };
}

export async function getNotas(): Promise<
  Array<{
    id: string;
    preview: string;
    dataCriacao: Date;
    conceitosRelacionados: { nome: string; id: string }[];
    flashcardCount: number;
  }>
> {
  const userId = await resolveUserId();

  const notas = await prisma.nota.findMany({
    where: { usuarioId: userId },
    orderBy: { dataCriacao: "desc" },
  });

  return Promise.all(
    notas.map(async (nota) => {
      const flashcardsCount = await prisma.conhecimentoAresta.count({
        where: {
          notaOrigemId: nota.id,
          nodeDestino: { tipoNode: "FLASHCARD" },
        },
      });

      const edges = await prisma.conhecimentoAresta.findMany({
        where: { notaOrigemId: nota.id },
        include: { nodeDestino: true },
      });

      const conceitosRelacionados: { nome: string; id: string }[] = [];
      for (const edge of edges) {
        if (edge.nodeDestino?.tipoNode === "CONCEITO") {
          const conceito = await prisma.conceito.findUnique({
            where: { id: edge.nodeDestino.referenciaId },
          });
          if (conceito) {
            conceitosRelacionados.push({ nome: conceito.nome, id: conceito.id });
          }
        }
      }

      return {
        id: nota.id,
        preview: nota.textoBruto.slice(0, 200),
        dataCriacao: nota.dataCriacao,
        conceitosRelacionados,
        flashcardCount: flashcardsCount,
      };
    }),
  );
}

export async function getNotaById(notaId: string): Promise<{
  id: string;
  textoBruto: string;
  dataCriacao: Date;
  conceitosRelacionados: { nome: string; tipoRelacao: string }[];
} | null> {
  const useCase = getGetNotaUseCase();
  const result = await useCase.execute(notaId, await resolveUserId());
  if (!result) return null;

  const edges = await prisma.conhecimentoAresta.findMany({
    where: { notaOrigemId: notaId },
    include: { nodeDestino: true },
  });

  const conceitosRelacionados: { nome: string; tipoRelacao: string }[] = [];
  for (const edge of edges) {
    if (edge.nodeDestino?.tipoNode === "CONCEITO") {
      const conceito = await prisma.conceito.findUnique({
        where: { id: edge.nodeDestino.referenciaId },
      });
      if (conceito) {
        conceitosRelacionados.push({ nome: conceito.nome, tipoRelacao: edge.tipoRelacao });
      }
    }
  }

  return {
    id: result.id,
    textoBruto: result.textoBruto,
    dataCriacao: result.createdAt,
    conceitosRelacionados,
  };
}

export async function deleteNota(id: string): Promise<{ success: boolean }> {
  const useCase = getDeleteNotaUseCase();
  await useCase.execute(id, await resolveUserId());

  revalidatePath("/notes");
  return { success: true };
}

export async function generateFlashcardsFromNota(
  notaId: string,
): Promise<{ flashcards: { id: string; pergunta: string }[] }> {
  const useCase = await getGenerateFlashcardsFromNotaUseCaseWithConcepts();
  const result = await useCase.execute(notaId, await resolveUserId());

  // Get flashcard details for UI feedback
  const flashcards = await prisma.flashcard.findMany({
    where: { id: { in: result.flashcardIds } },
    select: { id: true, pergunta: true },
  });

  revalidatePath("/notes");
  revalidatePath("/flashcards");
  return { flashcards };
}

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
