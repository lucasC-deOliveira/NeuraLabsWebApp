"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createReviewSchedule } from "@/lib/spaced-repetition";
import { OpenAI } from "openai";
import { resolveAIConfig } from "@/actions/settings";
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

// ==========================================
// Preview & Save Flashcards from Nota
// ==========================================

export type FlashcardSourceType =
  | "pergunta_resposta"
  | "cloze"
  | "bidirecional"
  | "explicacao_profunda"
  | "comparacao"
  | "lista_fragmentada"
  | "aplicacao_problema"
  | "identificacao_imagem"
  | "erro_comum"
  | "definicao"
  | "finalidade"
  | "importancia"
  | "caracteristicas"
  | "diferenca"
  | "conteudo";

const DEFINITION_PATTERN = /^([A-ZÀ-ÚÇ][a-zÀ-úÇ, ]{2,40}):\s(.+)$/;

function parseNoteSections(rawText: string) {
  const lines = rawText.split("\n");
  const sections: Array<{ heading: string; content: string[]; definitions: Array<{ term: string; explanation: string }> }> = [];
  let current: typeof sections[number] | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("#") || (line === line.toUpperCase() && line.length > 3 && /^[A-Z0-9À-ÚÇ ]+$/.test(line))) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^#+\s*/, ""), content: [], definitions: [] };
      continue;
    }

    if (!line) continue;

    if (!current) current = { heading: "Nota", content: [], definitions: [] };

    const defMatch = line.match(DEFINITION_PATTERN);
    if (defMatch) {
      current.definitions.push({ term: defMatch[1], explanation: defMatch[2] });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      current.content.push(line.slice(2));
    } else {
      current.content.push(line);
    }
  }

  if (current) sections.push(current);

  if (sections.length === 0) {
    return [
      { heading: "Nota", content: lines.filter((l) => l.trim().length > 0), definitions: [] },
    ];
  }

  return sections;
}

/** Resolve concept context for a nota */
function resolveContext(nota: {
  arestasOrigem: Array<{ nodeDestino?: { tipoNode: string; referenciaId: string } | null }>;
}, allConcepts: Array<{ id: string; nome: string }>) {
  const conceptNodeIds = nota.arestasOrigem
    .filter((e) => e.nodeDestino?.tipoNode === "CONCEITO")
    .map((e) => e.nodeDestino!.referenciaId);

  const findConcept = (searchFor: string): { id: string; nome: string } | null => {
    if (!searchFor) return null;
    const lower = searchFor.toLowerCase();
    const match = allConcepts.find((c) =>
      c.nome.toLowerCase().includes(lower) || lower.includes(c.nome.toLowerCase())
    );
    return match ? { id: match.id, nome: match.nome } : null;
  };

  const resolveFallback = (conceptTerm: string): { id: string; nome: string } | null => {
    let target = findConcept(conceptTerm);
    if (!target && conceptNodeIds.length > 0) {
      const existing = allConcepts.find((c) => c.id === conceptNodeIds[0]);
      if (existing) target = { id: existing.id, nome: existing.nome };
    }
    if (!target && allConcepts.length > 0) {
      const first = allConcepts[0];
      target = { id: first.id, nome: first.nome };
    }
    return target;
  };

  return { findConcept, resolveFallback };
}

/** Rule-based preview (fast, no AI) */
export async function previewFlashcardsFromNota(notaId: string): Promise<Array<{
  id: string;
  pergunta: string;
  resposta: string;
  conceitoId: string;
  conceptNome?: string;
  source: FlashcardSourceType;
}>> {
  const userId = await resolveUserId();

  const nota = await prisma.nota.findUnique({
    where: { id: notaId, usuarioId: userId },
    include: { arestasOrigem: { include: { nodeDestino: true } } },
  });

  if (!nota) throw new Error("Nota nao encontrada");

  const allConcepts = await prisma.conceito.findMany();
  const { resolveFallback } = resolveContext(nota, allConcepts);
  const sections = parseNoteSections(nota.textoBruto);

  const preview: Array<{
    id: string;
    pergunta: string;
    resposta: string;
    conceitoId: string;
    conceptNome?: string;
    source: FlashcardSourceType;
  }> = [];

  // 1. From definitions — Pergunta → Resposta (clássico)
  for (const section of sections) {
    for (const def of section.definitions) {
      const target = resolveFallback(def.term);
      if (!target) continue;

      preview.push({
        id: crypto.randomUUID(),
        pergunta: `O que e/define "${def.term}"?`,
        resposta: def.explanation,
        conceitoId: target.id,
        conceptNome: target.nome,
        source: "pergunta_resposta",
      });
    }
  }

  // 2. From content — multiple question types per section
  for (const section of sections) {
    if (section.content.length === 0) continue;

    const hasDefCards = preview.some(() => true) && sections.some((s) => s.definitions.length > 0);
    const target = resolveFallback(section.heading);

    if (!target || section.heading === "Nota") continue;

    const content = section.content.join("\n");
    const wordCount = content.split(/\s+/).length;

    // Define how many types to use based on content length
    const typeCount = Math.min(4, Math.max(1, Math.ceil(wordCount / 50)));

    const templates = [
      { pergunta: `O que e ${section.heading}?`, resposta: content.slice(0, 500), source: "pergunta_resposta" as const },
      { resposta: content.slice(0, 500), source: "cloze" as const },
      { pergunta: `O que e o oposto de ${section.heading}?`, resposta: content.slice(0, 400), source: "bidirecional" as const },
      { pergunta: `Explique detalhadamente: ${section.heading}`, resposta: content.slice(0, 600), source: "explicacao_profunda" as const },
      { pergunta: `Diferenca entre ${section.heading} e conceitos similares`, resposta: content.slice(0, 400), source: "comparacao" as const },
      { pergunta: `Cite os pontos principais sobre ${section.heading}`, resposta: content.split("\n").slice(0, 3).join("\n").slice(0, 300), source: "lista_fragmentada" as const },
      { pergunta: `O que acontece se ignorarmos ${section.heading}?`, resposta: content.slice(0, 400), source: "aplicacao_problema" as const },
      { pergunta: `Qual o erro mais comum sobre ${section.heading}?`, resposta: content.slice(0, 400), source: "erro_comum" as const },
    ];

    // Skip type 0 (pergunta_resposta) if definitions already produced cards
    const startIndex = hasDefCards ? 1 : 0;
    for (let i = startIndex; i < startIndex + typeCount && i < templates.length; i++) {
      const tpl = templates[i];
      // For cloze, create a fill-in-the-blank from first sentence
      const clozed = createClozeCard(section.heading, content);
      preview.push({
        id: crypto.randomUUID(),
        pergunta: tpl.pergunta || clozed.pergunta,
        resposta: tpl.resposta || clozed.resposta,
        conceitoId: target.id,
        conceptNome: target.nome,
        source: tpl.source,
      });
    }
  }

  return preview;
}

/** Generate a cloze-style card from content */
function createClozeCard(heading: string, content: string): { pergunta: string; resposta: string } {
  const firstLine = content.split("\n")[0] || content;
  const words = firstLine.split(/\s+/).filter((w) => w.length > 3);
  const keyWord = words[Math.floor(words.length / 2)] || "___";
  const clozed = firstLine.replace(new RegExp(`\\b${keyWord}\\b`, "i"), "{{...}}");
  return {
    pergunta: `Complete: ${clozed}`,
    resposta: keyWord,
  };
}

/** AI-powered flashcard generation with 9 card types */
export async function generateFlashcardsViaIA(notaId: string): Promise<Array<{
  id: string;
  pergunta: string;
  resposta: string;
  conceitoId: string;
  conceptNome?: string;
  source: FlashcardSourceType;
}>> {
  const userId = await resolveUserId();

  const nota = await prisma.nota.findUnique({
    where: { id: notaId, usuarioId: userId },
    include: { arestasOrigem: { include: { nodeDestino: true } } },
  });

  if (!nota) throw new Error("Nota nao encontrada");

  const allConcepts = await prisma.conceito.findMany();
  const conceptContext = allConcepts.map((c) => `- ${c.nome}`).join("\n");

  const aiConfig = await resolveAIConfig();
  if (!aiConfig.apiKey) {
    throw new Error("API key nao configurada. Configure em /settings.");
  }
  if (!aiConfig.model) {
    throw new Error("Modelo nao configurado. Configure em /settings.");
  }

  const openai = new OpenAI({
    apiKey: aiConfig.apiKey,
    baseURL: aiConfig.baseUrl,
  });

  const response = await openai.chat.completions.create({
    model: aiConfig.model,
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Voce e um especialista em criacao de flashcards educacionais. A partir do texto fornecido, gere flashcards variados usando os seguintes tipos:

tipos disponiveis:
- pergunta_resposta: Pergunta direta → Resposta. Ex: "O que e mitocôndria?" → "Organela responsavel pela producao de energia (ATP)."
- cloze: Preenchimento de l acuna. Ex: "A mitocôndria produz {{...}}." → "ATP"
- bidirecional: Dupla direcao. Gerar DOIS cards se aplicavel (ida e volta)
- explicacao_profunda: Conceito → Explicacao detalhada em etapas
- comparacao: Diferenca entre conceitos similares
- lista_fragmentada: Cite N pontos/funcoes (maximo 3-4 por card)
- aplicacao_problema: Cenario/situacao problema que testa o conhecimento
- erro_comum: Erro frequente sobre o tema → Explicacao do erro correto
- identificacao: Identificar/conceituar a partir de descricao

Regras:
1. Use o conteudo do texto como base para TODAS as respostas
2. Gere flashcards de tipos variados para o mesmo conteudo
3. Mantenha respostas concisas e precisas
4. Vincule cada flashcard a um conceito da lista quando possivel
5. Gere entre 5-15 flashcards dependendo do tamanho do texto
6. Use portugues brasileiro

Responda APENAS com JSON valido neste formato:
{"flashcards":[{"pergunta":"texto","resposta":"texto","tipo":"pergunta_resposta","conceito":"nome do conceito ou desconhecido"}]}

Conceitos disponiveis no sistema:
${conceptContext}`,
      },
      {
        role: "user",
        content: nota.textoBruto.slice(0, 15000),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  const { resolveFallback } = resolveContext(nota, allConcepts);

  try {
    const parsed = JSON.parse(content);
    const flashcards: Array<{
      id: string;
      pergunta: string;
      resposta: string;
      conceitoId: string;
      conceptNome?: string;
      source: FlashcardSourceType;
    }> = [];

    for (const fc of (parsed.flashcards || [])) {
      const tipo = (fc.tipo as FlashcardSourceType) || "pergunta_resposta";
      let target = resolveFallback(fc.conceito || "");

      if (!target && allConcepts.length > 0) {
        target = { id: allConcepts[0].id, nome: allConcepts[0].nome };
      }

      if (!target) continue;

      flashcards.push({
        id: crypto.randomUUID(),
        pergunta: fc.pergunta,
        resposta: fc.resposta,
        conceitoId: target.id,
        conceptNome: fc.conceito !== "desconhecido" ? target.nome : undefined,
        source: tipo,
      });
    }

    return flashcards;
  } catch (e) {
    console.error("Parse error IA:", e, "Raw:", content?.slice(0, 500));
    throw new Error("Erro ao interpretar resposta da IA.");
  }
}

/** Save selected preview flashcards with Nota -> FLASHCARD edges */
export async function saveFlashcardPreviews(data: Array<{
  pergunta: string;
  resposta: string;
  conceitoId: string;
}>): Promise<{ count: number }> {
  const userId = await resolveUserId();

  await prisma.$transaction(async (tx) => {
    for (const fc of data) {
      const created = await tx.flashcard.create({
        data: {
          pergunta: fc.pergunta,
          resposta: fc.resposta,
          conceitoId: fc.conceitoId,
          usuarioId: userId,
        },
      });

      const schedule = createReviewSchedule(3);
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

      await ensureKnowledgeNodes(tx, fc.conceitoId, created.id);
    }
  });

  revalidatePath("/flashcards");
  revalidatePath("/notes");
  return { count: data.length };
}

/** Save selected preview flashcards linked to a specific nota */
export async function saveFlashcardPreviewsFromNota(notaId: string, data: Array<{
  pergunta: string;
  resposta: string;
  conceitoId: string;
}>): Promise<{ count: number }> {
  const userId = await resolveUserId();

  await prisma.$transaction(async (tx) => {
    // Find/create the flashcard node for each card
    const flashcardNodeIds = new Map<string, string>();

    for (const fc of data) {
      const created = await tx.flashcard.create({
        data: {
          pergunta: fc.pergunta,
          resposta: fc.resposta,
          conceitoId: fc.conceitoId,
          usuarioId: userId,
        },
      });

      const schedule = createReviewSchedule(3);
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

      await ensureKnowledgeNodes(tx, fc.conceitoId, created.id);

      // Create FLASHCARD node
      const fcNode = await tx.nodeConhecimento.create({
        data: { tipoNode: "FLASHCARD", referenciaId: created.id },
      });
      flashcardNodeIds.set(created.id, fcNode.id);
    }

    // Create GERADO edges: Nota -> each Flashcard node
    for (const [flashcardId, fcNodeId] of flashcardNodeIds) {
      await tx.conhecimentoAresta.create({
        data: {
          notaOrigemId: notaId,
          nodeDestinoId: fcNodeId,
          tipoRelacao: "GERADO",
          peso: 1.0,
        },
      });
    }
  });

  revalidatePath("/flashcards");
  revalidatePath("/notes");
  return { count: data.length };
}
