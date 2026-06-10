"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

// ==========================================
// Subject (Assunto) Actions
// ==========================================

export async function createSubject(nome: string, descricao?: string): Promise<{ id: string }> {
  const userId = await requireUserId();
  const subject = await prisma.assunto.create({
    data: {
      nome,
      descricao: descricao ?? null,
      usuarioId: userId,
    },
  });

  revalidatePath("/subjects");
  return { id: subject.id };
}

export async function getSubjects(): Promise<
  Array<{
    id: string;
    nome: string;
    descricao: string | null;
    // topicos: Array<{
    //   id: string;
    //   nome: string;
    //   descricao: string | null;
    //   conceitos: Array<{
    //     id: string;
    //     nome: string;
    //     descricao: string | null;
    //   }>;
    // }>;
  }>
> {
  const userId = await requireUserId();
  return  prisma.assunto.findMany({
    where: { usuarioId: userId },
    // include: {
    //   topicos: {
    //     include: {
    //       conceitos: true,
    //     },
    //   },
    // },
    orderBy: { nome: "asc" },
  });
}

// ==========================================
// Topic (Topico) Actions
// ==========================================

export async function createTopic(
  assuntoId: string,
  nome: string,
  descricao?: string,
): Promise<{ id: string }> {
  await requireUserId();
  const topic = await prisma.topico.create({
    data: {
      assuntoId,
      nome,
      descricao: descricao ?? null,
    },
  });

  revalidatePath("/subjects");
  return { id: topic.id };
}

export async function getTopics(assuntoId: string): Promise<
  Array<{
    id: string;
    nome: string;
    descricao: string | null;
    conceitos: Array<{
      id: string;
      nome: string;
      descricao: string | null;
    }>;
  }>
> {
  return prisma.topico.findMany({
    where: { assuntoId },
    include: { conceitos: true },
    orderBy: { nome: "asc" },
  });
}

// ==========================================
// Concept (Conceito) Actions
// ==========================================

export async function createConcept(
  topicoId: string,
  nome: string,
  descricao?: string,
): Promise<{ id: string }> {
  await requireUserId();
  const concept = await prisma.conceito.create({
    data: {
      topicoId,
      nome,
      descricao: descricao ?? null,
    },
  });

  revalidatePath("/subjects");
  return { id: concept.id };
}

export async function getConcepts(topicoId: string): Promise<
  Array<{
    id: string;
    nome: string;
    descricao: string | null;
    flashcardCount: number;
  }>
> {
  const concepts = await prisma.conceito.findMany({
    where: { topicoId },
    include: {
      _count: {
        select: { flashcards: true },
      },
    },
    orderBy: { nome: "asc" },
  });

  return concepts.map((c: typeof concepts[number]) => ({
    id: c.id,
    nome: c.nome,
    descricao: c.descricao,
    flashcardCount: c._count.flashcards,
  }));
}
