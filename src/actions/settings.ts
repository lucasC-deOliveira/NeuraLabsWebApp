"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

async function resolveUserId(): Promise<string> {
  const user = await prisma.usuario.findFirst({ select: { id: true } });
  if (!user) {
    throw new Error("No user configured -- set up auth");
  }
  return user.id;
}

export interface ConfigAIData {
  apiKey: string;
  baseUrl: string;
  modelo: string;
}

export async function getConfigAI(): Promise<ConfigAIData | null> {
  const userId = await resolveUserId();
  const config = await prisma.configAI.findUnique({
    where: { usuarioId: userId },
  });
  if (!config) return null;
  return { apiKey: config.apiKey, baseUrl: config.baseUrl, modelo: config.modelo };
}

export async function saveConfigAI(
  data: ConfigAIData,
): Promise<{ success: boolean }> {
  const userId = await resolveUserId();
  await prisma.configAI.upsert({
    where: { usuarioId: userId },
    create: { usuarioId: userId, ...data },
    update: data,
  });
  revalidatePath("/settings");
  return { success: true };
}

/**
 * Resolve AI config: DB first, fallback to env vars.
 */
export async function resolveAIConfig(): Promise<{
  apiKey: string;
  baseUrl: string;
  model: string;
}> {
  const dbConfig = await getConfigAI().catch(() => null);
  return {
    apiKey: dbConfig?.apiKey ?? process.env.OPENAI_API_KEY ?? "",
    baseUrl: dbConfig?.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    model: dbConfig?.modelo ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  };
}

// ==========================================
// Hierarchy helpers — Assunto → Topico → Conceito
// ==========================================

export interface HierarchyNode {
  id: string;
  nome: string;
  children?: HierarchyNode[];
}

export async function getKnowledgeHierarchy(): Promise<HierarchyNode[]> {
  const assuntos = await prisma.assunto.findMany({
    include: {
      topicos: {
        include: {
          conceitos: true,
        },
      },
    },
  });

  return assuntos.map((assunto) => ({
    id: assunto.id,
    nome: assunto.nome,
    children: assunto.topicos.map((topico) => ({
      id: topico.id,
      nome: topico.nome,
      children: topico.conceitos.map((conceito) => ({
        id: conceito.id,
        nome: conceito.nome,
      })),
    })),
  }));
}

export async function createAssunto(nome: string): Promise<{ id: string; nome: string }> {
  const created = await prisma.assunto.create({ data: { nome } });
  revalidatePath("/notes/new");
  revalidatePath("/graph");
  return { id: created.id, nome: created.nome };
}

export async function createTopico(nome: string, assuntoId: string): Promise<{ id: string; nome: string }> {
  const created = await prisma.topico.create({ data: { nome, assuntoId } });
  revalidatePath("/notes/new");
  revalidatePath("/graph");
  return { id: created.id, nome: created.nome };
}

export async function createConceito(nome: string, topicoId: string): Promise<{ id: string; nome: string }> {
  const created = await prisma.conceito.create({ data: { nome, topicoId } });
  revalidatePath("/notes/new");
  revalidatePath("/graph");
  return { id: created.id, nome: created.nome };
}

/**
 * Create a full concept with automatic assunto/topico creation if they don't exist.
 */
export async function createFullConcept(input: {
  nome: string;
  assuntoId: string;
  topicoId: string;
}): Promise<{ id: string; nome: string }> {
  const created = await prisma.conceito.create({
    data: { nome: input.nome, topicoId: input.topicoId },
  });
  revalidatePath("/notes/new");
  revalidatePath("/graph");
  return { id: created.id, nome: created.nome };
}

/**
 * Full concept with relation types as tree: Assunto → RelAssuntoTopico → Topico → RelTopicoConceito → Conceito
 */
export interface ConceitoNode {
  id: string;
  nome: string;
  topicoNome?: string;
  topicoId?: string;
  assuntoNome?: string;
  assuntoId?: string;
}

export interface RelTopicoConceitoGroup {
  tipoRelacao: string;
  conceitos: ConceitoNode[];
}

export interface TopicoEntry {
  id: string;
  nome: string;
  assuntoId?: string;
  relacoesTopicoConceito: RelTopicoConceitoGroup[];
}

export interface RelAssuntoTopicoGroup {
  tipoRelacao: string;
  topicos: TopicoEntry[];
}

export interface ConceitoArvore {
  id: string;
  nome: string;
  relAssuntoTopico: RelAssuntoTopicoGroup[];
}

/**
 * Loads concepts grouped as:
 * Assunto → [tipo_rel_assunto_topico] → Topico → [tipo_rel_topico_conceito] → Conceito
 */
export async function getHierarquiaConceitos(): Promise<ConceitoArvore[]> {
  const topicos = await prisma.topico.findMany({
    include: { assunto: true, conceitos: true },
  });

  const arvore: ConceitoArvore[] = [];
  const assuntoMap = new Map<string, ConceitoArvore>();
  const topicoMap = new Map<string, TopicoEntry>();

  for (const t of topicos) {
    let assunto = assuntoMap.get(t.assunto.id);
    if (!assunto) {
      assunto = { id: t.assunto.id, nome: t.assunto.nome, relAssuntoTopico: [] };
      assuntoMap.set(t.assunto.id, assunto);
      arvore.push(assunto);
    }

    let relGrupo = assunto.relAssuntoTopico.find((r) => r.tipoRelacao === "PERTENCE_A");
    if (!relGrupo) {
      relGrupo = { tipoRelacao: "PERTENCE_A", topicos: [] };
      assunto.relAssuntoTopico.push(relGrupo);
    }

    let tp = topicoMap.get(t.id);
    if (!tp) {
      tp = { id: t.id, nome: t.nome, assuntoId: t.assunto.id, relacoesTopicoConceito: [] };
      relGrupo.topicos.push(tp);
      topicoMap.set(t.id, tp);
    }

    const conceitos = await prisma.conceito.findMany({ where: { topicoId: t.id } });

    for (const c of conceitos) {
      let relTC = tp.relacoesTopicoConceito.find((r) => r.tipoRelacao === "FUNDAMENTA");
      if (!relTC) {
        relTC = { tipoRelacao: "FUNDAMENTA", conceitos: [] };
        tp.relacoesTopicoConceito.push(relTC);
      }
      relTC.conceitos.push({
        id: c.id,
        nome: c.nome,
        topicoId: t.id,
        topicoNome: t.nome,
        assuntoId: t.assunto.id,
        assuntoNome: t.assunto.nome,
      });
    }
  }

  return arvore;
}
