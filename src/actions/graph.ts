"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildKnowledgeGraph, getCriticalNodes as libGetCriticalNodes, type GraphNode, type GraphEdge } from "@/lib/graph";

export interface GraphNodeType {
  id: string;
  label: string;
  type: "ASSUNTO" | "TOPICO" | "CONCEITO" | "FLASHCARD" | "NOTA";
  nivelDominio: number;
  prioridadeRevisao: number;
  parentId?: string;
  pergunta?: string;
}

export interface GraphEdgeType {
  source: string;
  target: string;
  type: string;
  peso: number;
}

export async function getGraphNodes(): Promise<{
  nodes: GraphNodeType[];
  edges: GraphEdgeType[];
}> {
  const userId = await requireUserId();
  const result = await buildKnowledgeGraph(userId);

  // Map builder types to action types
  const nodes: GraphNodeType[] = result.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    type: n.type,
    nivelDominio: n.nivelDominio,
    prioridadeRevisao: n.prioridadeRevisao,
    parentId: n.parentId,
    pergunta: n.pergunta,
  }));

  const edges: GraphEdgeType[] = result.edges.map((e) => ({
    source: e.source,
    target: e.target,
    type: e.type,
    peso: e.peso,
  }));

  return { nodes, edges };
}

export async function getCriticalNodes(): Promise<GraphNode[]> {
  const userId = await requireUserId();
  const { nodes } = await buildKnowledgeGraph(userId);
  return libGetCriticalNodes(nodes);
}

export async function clearAllGraphNodes(): Promise<{ count: number; summary: Record<string, number> }> {
  const userId = await requireUserId();

  const summary: Record<string, number> = {};

  // Delecao em ordem correta de FKs (filhos antes dos pais):
  await prisma.$transaction(async (tx) => {
    // 1. Coletar IDs necessarios
    const flashcardIds = (await tx.flashcard.findMany({
      where: { usuarioId: userId },
      select: { id: true },
    })).map((f) => f.id);

    const sessionIds = (await tx.sessaoEstudo.findMany({
      where: { usuarioId: userId },
      select: { id: true },
    })).map((s) => s.id);

    const notaIds = (await tx.nota.findMany({
      where: { usuarioId: userId },
      select: { id: true },
    })).map((n) => n.id);

    const nodeIds = (await tx.nodeConhecimento.findMany({
      where: { usuarioId: userId },
      select: { id: true },
    })).map((n) => n.id);

    // Fallback para evitar erro com array vazio no Prisma/SQLite
    const safeIn = (ids: string[]) => ids.length > 0 ? ids : ["__none__"];

    // 2. Revisoes (dependem de flashcard e sessao)
    const r1 = await tx.revisaoFlashcard.deleteMany({
      where: { OR: [
        { flashcardId: { in: safeIn(flashcardIds) } },
        { sessaoId: { in: safeIn(sessionIds) } },
      ] },
    });
    summary.revisoes = r1.count;

    // 3. Aprendizado
    const r2 = await tx.aprendizadoFlashcard.deleteMany({
      where: { usuarioId: userId },
    });
    summary.aprendizado = r2.count;

    // 4. Flashcards
    const r3 = await tx.flashcard.deleteMany({
      where: { usuarioId: userId },
    });
    summary.flashcards = r3.count;

    // 5. Arestas do grafo (referenciam nodes e notas)
    const r4 = await tx.conhecimentoAresta.deleteMany({
      where: { OR: [
        { nodeOrigemId: { in: safeIn(nodeIds) } },
        { nodeDestinoId: { in: safeIn(nodeIds) } },
        { notaOrigemId: { in: safeIn(notaIds) } },
        { notaDestinoId: { in: safeIn(notaIds) } },
      ] },
    });
    summary.arestas = r4.count;

    // 6. Desempenho nos nodes
    const r5 = await tx.desempenhoNo.deleteMany({
      where: { usuarioId: userId },
    });
    summary.desempenho = r5.count;

    // 7. Nodes do grafo
    const r6 = await tx.nodeConhecimento.deleteMany({
      where: { usuarioId: userId },
    });
    summary.nodes = r6.count;

    // 8. Notas
    const r7 = await tx.nota.deleteMany({
      where: { usuarioId: userId },
    });
    summary.notas = r7.count;

    // 9. Assuntos (cascade topicos e conceitos)
    const r8 = await tx.assunto.deleteMany({
      where: { usuarioId: userId },
    });
    summary.assuntos = r8.count;

    // 10. Sessoes de estudo (revisoes ja apagadas)
    const r9 = await tx.sessaoEstudo.deleteMany({
      where: { usuarioId: userId },
    });
    summary.sessoes = r9.count;
  });

  // Revalidate rotas afetadas
  revalidatePath("/graph");
  revalidatePath("/flashcards");
  revalidatePath("/notes");
  revalidatePath("/study");
  revalidatePath("/");

  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  return { count: total, summary };
}
