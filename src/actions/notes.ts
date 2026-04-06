"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { OpenAI } from "openai";
import { getCreateNotaUseCaseWithConcepts } from "@/modules/notas/adapters/nota-composer";
import { resolveAIConfig } from "@/actions/settings";

// ==========================================
// Manual Note Creation
// ==========================================

export interface NotaConceitoRel {
  conceitoId: string;
  tipoRelacao: string;
}

export interface ConceitoConceitoRel {
  origemId: string;
  destinoId: string;
  tipoRelacao: string;
}

export interface ManualNotaInput {
  titulo: string;
  conteudo: string;
  selectedConceitoIds: string[];
  notaConceitoRels?: NotaConceitoRel[];
  conceitoConceitoRels?: ConceitoConceitoRel[];
}

export async function createNotaManual(
  input: ManualNotaInput,
): Promise<{ notaId: string }> {
  const userId = await resolveUserId();

  return prisma.$transaction(async (tx) => {
    // 1. Create nota
    const rawText = `# ${input.titulo}\n\n${input.conteudo}`;
    const nota = await tx.nota.create({ data: { usuarioId: userId, textoBruto: rawText } });
    const notaNode = await tx.nodeConhecimento.create({ data: { tipoNode: "NOTA", referenciaId: nota.id } });

    const conceitoIds = input.selectedConceitoIds;
    if (conceitoIds.length === 0) {
      return { notaId: nota.id };
    }

    // Concepts with hierarchy
    const conceitos = await tx.conceito.findMany({
      where: { id: { in: conceitoIds } },
      include: { topico: { include: { assunto: true } } },
    });

    // Build concept map
    const buildNode = async (tipo: string, refId: string): Promise<string> => {
      const existing = await tx.nodeConhecimento.findFirst({ where: { tipoNode: tipo as never, referenciaId: refId } });
      if (existing) return existing.id;
      const created = await tx.nodeConhecimento.create({ data: { tipoNode: tipo as never, referenciaId: refId } });
      return created.id;
    };

    const assuntoSet = new Set(conceitos.map((c) => c.topico.assuntoId));
    const topicoSet = new Set(conceitos.map((c) => c.topicoId));

    const assuntoNodeIds: Record<string, string> = {};
    const topicoNodeIds: Record<string, string> = {};
    const conceitoNodeIds: Record<string, string> = {};

    for (const aId of assuntoSet) assuntoNodeIds[aId] = await buildNode("ASSUNTO", `assunto-${aId}`);
    for (const tId of topicoSet) topicoNodeIds[tId] = await buildNode("TOPICO", `topico-${tId}`);
    for (const c of conceitos) {
      const refId = `conceito-${c.id}`;
      conceitoNodeIds[c.id] = await buildNode("CONCEITO", refId);
    }

    // ASSUNTO -> TOPICO (PERTENCE_A)
    for (const tId of topicoSet) {
      const cData = conceitos.find((c) => c.topicoId === tId);
      if (cData) {
        await ensureEdge(tx, assuntoNodeIds[cData.topico.assuntoId], topicoNodeIds[tId], "PERTENCE_A");
      }
    }

    // TOPICO -> CONCEITO (DEFINE)
    for (const c of conceitos) {
      await ensureEdge(tx, topicoNodeIds[c.topicoId], conceitoNodeIds[c.id], "DEFINE");
    }

    // NOTA -> CONCEITO (user-specified or default DEFINE)
    for (const c of conceitos) {
      const userRel = input.notaConceitoRels?.find((r) => r.conceitoId === c.id);
      const tipo = userRel?.tipoRelacao || "DEFINE";
      await ensureEdge(tx, notaNode.id, conceitoNodeIds[c.id], tipo);
    }

    // CONCEITO <-> CONCEITO (user-specified semantic relations)
    if (input.conceitoConceitoRels) {
      for (const rel of input.conceitoConceitoRels) {
        const oNode = conceitoNodeIds[rel.origemId];
        const dNode = conceitoNodeIds[rel.destinoId];
        if (oNode && dNode) {
          await ensureEdge(tx, oNode, dNode, rel.tipoRelacao);
        }
      }
    }

    revalidatePath("/notes");
    revalidatePath("/graph");
    return { notaId: nota.id };
  });
}

async function ensureEdge(
  tx: any,
  origemId: string,
  destinoId: string,
  tipoRelacao: string,
) {
  const exists = await tx.conhecimentoAresta.findFirst({
    where: { nodeOrigemId: origemId, nodeDestinoId: destinoId, tipoRelacao: tipoRelacao as never },
  });
  if (!exists) {
    await tx.conhecimentoAresta.create({
      data: { nodeOrigemId: origemId, nodeDestinoId: destinoId, tipoRelacao: tipoRelacao as never, peso: 0.9 },
    });
  }
}

// ==========================================
// AI Analysis
// ==========================================

export interface NotaCandidata {
  titulo: string;
  conteudo: string;
  conceitosPrevistos: string[];
}

// AI Analysis
// ==========================================

export interface NotaCandidata {
  titulo: string;
  conteudo: string;
  conceitosPrevistos: string[];
}

async function resolveUserId(): Promise<string> {
  const user = await prisma.usuario.findFirst({ select: { id: true } });
  if (!user) {
    throw new Error("No user configured -- set up auth");
  }
  return user.id;
}

export async function analyzeRawText(rawText: string): Promise<{ candidatas: NotaCandidata[] }> {
  if (!rawText.trim()) return { candidatas: [] };

  const allConcepts = await prisma.conceito.findMany({
    include: { topico: { include: { assunto: true } } },
  });

  const contextList = allConcepts.map((c) =>
    `${c.nome} (topico: ${c.topico.nome}, assunto: ${c.topico.assunto.nome})`,
  ).join(", ");

  const aiConfig = await resolveAIConfig();
  if (!aiConfig.apiKey) {
    throw new Error("API key nao configurada. Configure em /settings.");
  }

  const openai = new OpenAI({
    apiKey: aiConfig.apiKey,
    baseURL: aiConfig.baseUrl,
  });

  const model = aiConfig.model;

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system" as const,
        content: `Voce e um assistente de analise de texto educacional. Dado um texto bruto, identifique QUANTAS NOTAS fizerem sentido. Cada nota deve ter titulo e conteudo organizado. Conceitos existentes: ${contextList}.

Responda APENAS com JSON valido neste formato:
{"notas":[{"titulo":"Nome","conteudo":"Conteudo organizado","conceitos_relacionados":["conceito1"]}]}
Sem markdown, sem explicacao fora do JSON.`,
      },
      {
        role: "user" as const,
        content: rawText.slice(0, 15000),
      },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) return { candidatas: [] };

  try {
    const parsed = JSON.parse(content);
    const candidatas: NotaCandidata[] = (parsed.notas || []).map((n: Record<string, unknown>) => ({
      titulo: (n.titulo as string) || "Nota sem titulo",
      conteudo: (n.conteudo as string) || "",
      conceitosPrevistos: (n.conceitos_relacionados as string[]) || [],
    }));
    return { candidatas };
  } catch (e) {
    console.error("Parse error:", e, "Raw:", content?.slice(0, 500));
    return {
      candidatas: [{ titulo: "Nota", conteudo: rawText, conceitosPrevistos: [] }],
    };
  }
}

export interface SaveSelectedNotaInput {
  titulo: string;
  conteudo: string;
}

export async function saveSelectedNotas(
  candidatas: SaveSelectedNotaInput[],
): Promise<{ notaIds: string[] }> {
  const userId = await resolveUserId();
  const notaIds: string[] = [];

  for (const candidata of candidatas) {
    const useCase = await getCreateNotaUseCaseWithConcepts();
    const result = await useCase.execute({
      rawText: candidata.conteudo,
      userId,
      titulo: candidata.titulo,
    });
    notaIds.push(result.notaId);
  }

  revalidatePath("/notes");
  revalidatePath("/graph");
  return { notaIds };
}

/**
 * Parse raw text into structured markdown-like content.
 * Detects headings (lines starting with # or ALL CAPS), bullet points, definitions, and paragraphs.
 */
interface ParsedSection {
  heading: string;
  content: string[]; // lines of content under heading
  definitions: Array<{ term: string; explanation: string }>;
}

function parseRawTextIntoSections(rawText: string): ParsedSection[] {
  const lines = rawText.split("\n");
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Markdown heading (# Title) or ALL CAPS line as pseudo-heading
    if (trimmed.startsWith("#") || (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /^[A-Z0-9À-ÚÇ ]+$/.test(trimmed))) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        heading: trimmed.replace(/^#+\s*/, ""),
        content: [],
        definitions: [],
      };
      continue;
    }

    if (!trimmed) continue;

    // "Term: definition" pattern
    if (currentSection && /^[A-ZÀ-ÚÇ][a-zÀ-úÇ, ]{2,40}:\s/.test(trimmed)) {
      const colonIdx = trimmed.indexOf(":");
      currentSection.definitions.push({
        term: trimmed.slice(0, colonIdx).trim(),
        explanation: trimmed.slice(colonIdx + 1).trim(),
      });
    }

    // Bullet point
    if (currentSection && (trimmed.startsWith("- ") || trimmed.startsWith("* "))) {
      currentSection.content.push(trimmed.slice(2));
    }

    // Regular text line
    if (currentSection) {
      currentSection.content.push(trimmed);
    }
  }

  if (currentSection) sections.push(currentSection);

  // If no sections detected, treat entire text as one section
  if (sections.length === 0) {
    sections.push({
      heading: "Nota",
      content: lines.map((l) => l.trim()).filter(Boolean),
      definitions: [],
    });
  }

  return sections;
}

function sectionsToMarkdown(sections: ParsedSection[]): string {
  return sections
    .map((s) => {
      const lines: string[] = [`## ${s.heading}\n`];
      if (s.definitions.length > 0) {
        for (const def of s.definitions) {
          lines.push(`- **${def.term}**: ${def.explanation}`);
        }
        lines.push("");
      }
      if (s.content.length > 0) {
        lines.push(s.content.join("\n"));
      }
      return lines.join("\n");
    })
    .join("\n---\n\n");
}

function extractTermsFromSections(sections: ParsedSection[]): string[] {
  const terms: string[] = [];
  for (const section of sections) {
    for (const def of section.definitions) {
      terms.push(def.term);
    }
    // Also use the heading as a potential concept name
    if (section.heading && section.heading !== "Nota") {
      terms.push(section.heading);
    }
  }
  return terms;
}

// ==========================================
// Find matching concepts for extracted terms
// ==========================================

async function findMatchingConcepts(terms: string[]): Promise<
  Array<{ term: string; conceitoId: string; topicoId: string; assuntoId: string }>
> {
  const matches: Array<{ term: string; conceitoId: string; topicoId: string; assuntoId: string }> = [];

  // Pre-load all concepts with their topic data
  const allConcepts = await prisma.conceito.findMany({
    include: { topico: true },
  });

  for (const term of terms) {
    const lowerTerm = term.toLowerCase();

    // Find by case-insensitive substring match (SQLite doesn't support mode: insensitive)
    const concept = allConcepts.find((c) =>
      c.nome.toLowerCase().includes(lowerTerm) ||
      lowerTerm.includes(c.nome.toLowerCase()),
    );

    if (concept) {
      matches.push({
        term,
        conceitoId: concept.id,
        topicoId: concept.topicoId,
        assuntoId: "", // Will resolve via topico if needed
      });
    }
  }

  return matches;
}

// ==========================================
// Note Actions
// ==========================================

export async function createNota(
  rawText: string,
  titulo?: string,
): Promise<{ notaId: string; matchedConcepts: { term: string; conceito: string }[]; createdNodes: number }> {
  const userId = await resolveUserId();

  // Parse the text
  const sections = parseRawTextIntoSections(rawText);
  const markdown = sectionsToMarkdown(sections);

  let createdNodes = 0;

  const result = await prisma.$transaction(async (tx) => {
    // ── 1. Create the Nota record
    const notaText = titulo ? `# ${titulo}\n\n${markdown}` : markdown;
    const nota = await tx.nota.create({
      data: { usuarioId: userId, textoBruto: notaText },
    });
    createdNodes++;

    // ── 2. Create raw text graph node (TEXTO_BRUTO = NOTA type with rawtext prefix)
    const rawTextNode = await tx.nodeConhecimento.create({
      data: { tipoNode: "NOTA", referenciaId: `rawtext-${nota.id}` },
    });
    createdNodes++;

    // ── 3. Create note graph node
    const notaNode = await tx.nodeConhecimento.create({
      data: { tipoNode: "NOTA", referenciaId: nota.id },
    });
    createdNodes++;

    // ── 4. Link: TEXTO_BRUTO → GERA → NOTA
    await tx.conhecimentoAresta.create({
      data: { nodeOrigemId: rawTextNode.id, nodeDestinoId: notaNode.id, tipoRelacao: "GERA", peso: 1.0 },
    });
    createdNodes++;

    // ── 5. Load concepts for matching
    const allConcepts = await tx.conceito.findMany({
      include: { topico: { include: { assunto: true } } },
    });

    const findConcept = (term: string) => {
      const lower = term.toLowerCase();
      return allConcepts.find((c) =>
        c.nome.toLowerCase() === lower ||
        c.nome.toLowerCase().includes(lower) ||
        lower.includes(c.nome.toLowerCase()),
      );
    };

    // ── 6. Extract all unique concept mentions from sections
    const mentions: { term: string; concept: (typeof allConcepts)[number] }[] = [];
    const seenConcepts = new Set<string>();
    const topicosSet = new Set<string>();
    const assuntosSet = new Set<string>();

    for (const section of sections) {
      const headingConcept = findConcept(section.heading);
      if (headingConcept && !seenConcepts.has(headingConcept.id)) {
        mentions.push({ term: section.heading, concept: headingConcept });
        seenConcepts.add(headingConcept.id);
        topicosSet.add(headingConcept.topicoId);
        assuntosSet.add(headingConcept.topico.assuntoId);
      }

      for (const def of section.definitions) {
        const mc = findConcept(def.term);
        if (mc && !seenConcepts.has(mc.id)) {
          mentions.push({ term: def.term, concept: mc });
          seenConcepts.add(mc.id);
          topicosSet.add(mc.topicoId);
          assuntosSet.add(mc.topico.assuntoId);
        }
      }

      for (const line of section.content) {
        if (!line.startsWith("- ") && !line.startsWith("* ")) continue;
        const matched = findConcept(line.slice(2).trim());
        if (matched && !seenConcepts.has(matched.id)) {
          mentions.push({ term: line.slice(2).trim(), concept: matched });
          seenConcepts.add(matched.id);
          topicosSet.add(matched.topicoId);
          assuntosSet.add(matched.topico.assuntoId);
        }
      }
    }

    // ── 7. Create ASSUNTO nodes + link: ASSUNTO → GERA → TOPICOS → DEFINE → CONCEITOS → REFERENCIA → TEXTO_BRUTO → GERA → NOTA
    const assuntoNodeId = new Map<string, string>();

    for (const assuntoId of assuntosSet) {
      const assunto = allConcepts[0]?.topico?.assunto ?? null;
      const assuntoConcept = mentions.find((m) => m.concept.topico.assuntoId === assuntoId);
      const existingNode = await tx.nodeConhecimento.findFirst({
        where: { tipoNode: "ASSUNTO", referenciaId: `assunto-${assuntoId}` },
      });
      const nodeId = existingNode?.id ?? (await tx.nodeConhecimento.create({
        data: { tipoNode: "ASSUNTO", referenciaId: `assunto-${assuntoId}` },
      })).id;
      if (!existingNode) createdNodes++;
      assuntoNodeId.set(assuntoId, nodeId);
    }

    // ── 8. Create TOPICO nodes + link ASSUNTO → TOPICO
    const topicoNodeId = new Map<string, string>();

    for (const topicoId of topicosSet) {
      const existingNode = await tx.nodeConhecimento.findFirst({
        where: { tipoNode: "TOPICO", referenciaId: `topico-${topicoId}` },
      });
      const nodeId = existingNode?.id ?? (await tx.nodeConhecimento.create({
        data: { tipoNode: "TOPICO", referenciaId: `topico-${topicoId}` },
      })).id;
      if (!existingNode) createdNodes++;
      topicoNodeId.set(topicoId, nodeId);

      // Link ASSUNTO → TOPICO
      const topicoData = allConcepts.find((c) => c.topicoId === topicoId);
      if (topicoData) {
        const aNodeId = assuntoNodeId.get(topicoData.topico.assuntoId);
        if (aNodeId) {
          const exists = await tx.conhecimentoAresta.findFirst({
            where: { nodeOrigemId: aNodeId, nodeDestinoId: nodeId, tipoRelacao: "GERA" },
          });
          if (!exists) {
            await tx.conhecimentoAresta.create({
              data: { nodeOrigemId: aNodeId, nodeDestinoId: nodeId, tipoRelacao: "GERA", peso: 0.9 },
            });
            createdNodes++;
          }
        }
      }
    }

    // ── 9. Create CONCEITO nodes + link TOPICO → CONCEITO + link CONCEITO → TEXTO_BRUTO
    const conceitoNodeId = new Map<string, string>();

    for (const { term, concept } of mentions) {
      const refId = `conceito-${concept.id}`;
      const existingNode = await tx.nodeConhecimento.findFirst({
        where: { tipoNode: "CONCEITO", referenciaId: refId },
      });
      const cNodeId = existingNode?.id ?? (await tx.nodeConhecimento.create({
        data: { tipoNode: "CONCEITO", referenciaId: refId },
      })).id;
      if (!existingNode) createdNodes++;
      conceitoNodeId.set(concept.id, cNodeId);

      // Link TOPICO → CONCEITO
      const tNodeId = topicoNodeId.get(concept.topicoId);
      if (tNodeId) {
        const exists = await tx.conhecimentoAresta.findFirst({
          where: { nodeOrigemId: tNodeId, nodeDestinoId: cNodeId, tipoRelacao: "DEFINE" },
        });
        if (!exists) {
          await tx.conhecimentoAresta.create({
            data: { nodeOrigemId: tNodeId, nodeDestinoId: cNodeId, tipoRelacao: "DEFINE", peso: 0.9 },
          });
          createdNodes++;
        }
      }

      // Link CONCEITO → TEXTO_BRUTO
      const existsRef = await tx.conhecimentoAresta.findFirst({
        where: { nodeOrigemId: cNodeId, nodeDestinoId: rawTextNode.id },
      });
      if (!existsRef) {
        await tx.conhecimentoAresta.create({
          data: { nodeOrigemId: cNodeId, nodeDestinoId: rawTextNode.id, tipoRelacao: "REFERENCIA", peso: 0.7 },
        });
        createdNodes++;
      }
    }

    // ── 10. Link NOTA → CONCEITO (note references all concepts it covers)
    for (const [conceitoId, cNodeId] of conceitoNodeId) {
      // Link NOTA → CONCEITO
      const exists = await tx.conhecimentoAresta.findFirst({
        where: { nodeOrigemId: notaNode.id, nodeDestinoId: cNodeId, tipoRelacao: "REFERENCIA" },
      });
      if (!exists) {
        await tx.conhecimentoAresta.create({
          data: { nodeOrigemId: notaNode.id, nodeDestinoId: cNodeId, tipoRelacao: "REFERENCIA", peso: 0.8 },
        });
        createdNodes++;
      }
    }

    const matchedConceptsList = mentions.map((m) => ({
      term: m.term,
      conceitoId: m.concept.id,
      topicoId: m.concept.topicoId,
      assuntoId: m.concept.topico.assuntoId,
    }));

    return { notaId: nota.id, conceptMatches: matchedConceptsList };
  });

  revalidatePath("/notes");
  revalidatePath("/graph");
  return {
    notaId: result.notaId,
    matchedConcepts: result.conceptMatches.map((m) => ({
      term: m.term,
      conceito: m.conceitoId,
    })),
    createdNodes,
  };
}

export async function getNotasFilterData(): Promise<
  Array<{ id: string; nome: string }>
> {
  const userId = await resolveUserId();

  // All unique concepts linked to user's notes with hierarchy
  const edges = await prisma.nota.findMany({
    where: { usuarioId: userId },
    include: {
      arestasOrigem: {
        include: {
          nodeDestino: true,
        },
      },
    },
  });

  const conceitoIds = new Set<string>();
  for (const nota of edges) {
    for (const edge of nota.arestasOrigem) {
      if (edge.nodeDestino?.tipoNode === "CONCEITO") {
        conceitoIds.add(edge.nodeDestino.referenciaId);
      }
    }
  }

  if (conceitoIds.size === 0) return [];

  const conceitos = await prisma.conceito.findMany({
    where: { id: { in: Array.from(conceitoIds) } },
    include: { topico: true },
  });

  const assuntos = await prisma.assunto.findMany({ include: { topicos: true } });
  const conceitoTopicos = new Map<string, { topicoNome: string; assuntoId: string }>();
  for (const c of conceitos) {
    conceitoTopicos.set(c.id, { topicoNome: c.topico.nome, assuntoId: c.topico.assuntoId });
  }

  const result: Array<{ id: string; nome: string }> = [];
  for (const a of assuntos) {
    if (conceitos.some((c) => c.topico.assuntoId === a.id)) {
      result.push({ id: a.id, nome: a.nome });
    }
  }
  result.sort((a, b) => a.nome.localeCompare(b.nome));
  return result;
}

export async function getNotas(): Promise<
  Array<{
    id: string;
    preview: string;
    titulo: string;
    dataCriacao: Date;
    conceitosRelacionados: { nome: string; id: string }[];
    flashcardCount: number;
    wordCount: number;
  }>
> {
  const userId = await resolveUserId();

  const notas = await prisma.nota.findMany({
    where: { usuarioId: userId },
    orderBy: { dataCriacao: "desc" },
  });

  // Bulk load concept associations
  const notaIds = notas.map((n) => n.id);
  const allEdges = await prisma.conhecimentoAresta.findMany({
    where: {
      notaOrigemId: { in: notaIds },
    },
    include: { nodeDestino: true },
  });

  const fcCounts = await prisma.conhecimentoAresta.groupBy({
    by: ["notaOrigemId"],
    _count: { notaOrigemId: true },
    where: {
      notaOrigemId: { in: notaIds },
      nodeDestino: { tipoNode: "FLASHCARD" },
    },
  });

  const fcCountMap = new Map<string, number>();
  for (const g of fcCounts) {
    if (g.notaOrigemId) fcCountMap.set(g.notaOrigemId, g._count.notaOrigemId);
  }

  const edgesByNota = new Map<string, typeof allEdges>();
  for (const edge of allEdges) {
    if (edge.notaOrigemId) {
      const arr = edgesByNota.get(edge.notaOrigemId) || [];
      arr.push(edge);
      edgesByNota.set(edge.notaOrigemId, arr);
    }
  }

  // Load all concepts once
  const conceitoIds = new Set<string>();
  for (const edges of edgesByNota.values()) {
    for (const edge of edges) {
      if (edge.nodeDestino?.tipoNode === "CONCEITO") {
        conceitoIds.add(edge.nodeDestino.referenciaId);
      }
    }
  }
  const allConcepts = await prisma.conceito.findMany({
    where: { id: { in: Array.from(conceitoIds) } },
  });
  const conceptMap = new Map(allConcepts.map((c) => [c.id, c.nome]));

  return notas.map((nota) => {
    const edges = edgesByNota.get(nota.id) || [];
    const conceitosRelacionados: { nome: string; id: string }[] = [];
    for (const edge of edges) {
      if (edge.nodeDestino?.tipoNode === "CONCEITO") {
        const nome = conceptMap.get(edge.nodeDestino.referenciaId);
        if (nome) conceitosRelacionados.push({ nome, id: edge.nodeDestino.referenciaId });
      }
    }

    const textoBruto = nota.textoBruto || "";
    const titulo = textoBruto
      .split("\n")[0]
      .replace(/^#+\s*/, "")
      .slice(0, 80) || "Sem titulo";
    const preview = textoBruto.replace(/^#+\s.*\n?/, "").slice(0, 200).trim();
    const wordCount = textoBruto.trim().split(/\s+/).filter(Boolean).length;

    return {
      id: nota.id,
      titulo,
      preview,
      dataCriacao: nota.dataCriacao,
      conceitosRelacionados,
      flashcardCount: fcCountMap.get(nota.id) ?? 0,
      wordCount,
    };
  });
}

export async function getNotaById(notaId: string): Promise<{
  id: string;
  textoBruto: string;
  dataCriacao: Date;
  conceitosRelacionados: { nome: string; tipoRelacao: string }[];
} | null> {
  const userId = await resolveUserId();

  const nota = await prisma.nota.findUnique({
    where: { id: notaId, usuarioId: userId },
    include: {
      arestasOrigem: {
        include: { nodeDestino: true },
      },
    },
  });

  if (!nota) return null;

  const conceitosRelacionados: { nome: string; tipoRelacao: string }[] = [];
  for (const edge of nota.arestasOrigem) {
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
    id: nota.id,
    textoBruto: nota.textoBruto,
    dataCriacao: nota.dataCriacao,
    conceitosRelacionados,
  };
}

export async function deleteNota(id: string): Promise<{ success: boolean }> {
  await prisma.nota.delete({ where: { id } });
  revalidatePath("/notes");
  return { success: true };
}

export async function deleteAllNotas(): Promise<{ count: number }> {
  const userId = await resolveUserId();
  const count = await prisma.nota.deleteMany({ where: { usuarioId: userId } });
  revalidatePath("/notes");
  return { count: count.count };
}

// ==========================================
// Generate Flashcards from Note
// ==========================================

export async function generateFlashcardsFromNota(
  notaId: string,
): Promise<{ flashcards: { id: string; pergunta: string }[] }> {
  const userId = await resolveUserId();

  const result = await prisma.$transaction(async (tx) => {
    // Load concepts upfront for memory matching (SQLite lacks case-insensitive support)
    const allConcepts = await tx.conceito.findMany();

    // Match concept by name (case-insensitive, in-memory)
    const findConcept = (searchFor: string): string | null => {
      if (!searchFor) return null;
      const lower = searchFor.toLowerCase();
      return (
        allConcepts.find((c) =>
          c.nome.toLowerCase().includes(lower) ||
          lower.includes(c.nome.toLowerCase()),
        )?.id ?? null
      );
    };

    // Get the nota with its semantic edges
    const nota = await tx.nota.findUnique({
      where: { id: notaId, usuarioId: userId },
      include: {
        arestasOrigem: {
          include: { nodeDestino: true },
        },
      },
    });

    if (!nota) {
      throw new Error("Nota not found");
    }

    // Parse sections to extract definitions as Q&A pairs
    const sections = parseRawTextIntoSections(nota.textoBruto);
    const flashcards: Array<{ id: string; pergunta: string; conceitoId: string }> = [];

    // Build concept map from nota edges (which concepts this nota is about)
    const conceptNodeIds = nota.arestasOrigem
      .filter((e) => e.nodeDestino?.tipoNode === "CONCEITO")
      .map((e) => e.nodeDestino!.referenciaId);

    // 1. Generate flashcards from explicit definitions (Term: Explanation)
    for (const section of sections) {
      for (const def of section.definitions) {
        // Match by explicit term -> concept name
        let targetConceptId = findConcept(def.term);

        // Fallback to first concept linked to this nota, or first available
        if (!targetConceptId && conceptNodeIds.length > 0) {
          targetConceptId = conceptNodeIds[0];
        }

        if (!targetConceptId && allConcepts.length > 0) {
          targetConceptId = allConcepts[0].id;
        }

        if (!targetConceptId) continue;

        // Create flashcard: question = term, answer = explanation
        const fc = await tx.flashcard.create({
          data: {
            pergunta: `O que é/define "${def.term}"?`,
            resposta: def.explanation,
            conceitoId: targetConceptId,
            usuarioId: userId,
          },
        });

        // Create spaced repetition record
        const nextReview = new Date();
        await tx.aprendizadoFlashcard.create({
          data: {
            flashcardId: fc.id,
            usuarioId: userId,
            dificuldade: 5,
            intervalo: 0,
            proximaRevisao: nextReview,
            ultimaRevisao: nextReview,
            estagioAprendizado: 1,
          },
        });

        // Ensure concept node exists
        const conceptNode = await tx.nodeConhecimento.findFirst({
          where: { tipoNode: "CONCEITO", referenciaId: targetConceptId },
        });
        const finalConceptNode = conceptNode ?? await tx.nodeConhecimento.create({
          data: { tipoNode: "CONCEITO", referenciaId: targetConceptId },
        });

        // Create flashcard node
        await tx.nodeConhecimento.create({
          data: { tipoNode: "FLASHCARD", referenciaId: fc.id },
        });

        // Link Flashcard -> Concept with TESTA_DEFINICAO
        const fcNode = await tx.nodeConhecimento.findFirst({
          where: { tipoNode: "FLASHCARD", referenciaId: fc.id },
        });

        if (fcNode) {
          await tx.conhecimentoAresta.create({
            data: {
              nodeOrigemId: fcNode.id,
              nodeDestinoId: finalConceptNode.id,
              tipoRelacao: "TESTA_DEFINICAO",
              peso: 1.0,
            },
          });

          // Link Nota -> Flashcard with GERA
          await tx.conhecimentoAresta.create({
            data: {
              notaOrigemId: nota.id,
              nodeDestinoId: fcNode.id,
              tipoRelacao: "GERA",
              peso: 1.0,
            },
          });

          // Link Flashcard -> Nota with REFERENCIA
          await tx.conhecimentoAresta.create({
            data: {
              nodeOrigemId: fcNode.id,
              notaOrigemId: nota.id,
              tipoRelacao: "REFERENCIA",
              peso: 0.8,
            },
          });
        }

        flashcards.push({ id: fc.id, pergunta: fc.pergunta, conceitoId: targetConceptId });
      }
    }

    // 2. Fallback: create cards from section headings + content
    if (flashcards.length === 0) {
      for (const section of sections) {
        if (section.content.length === 0) continue;

        // Match by heading -> concept name
        let targetConceptId = findConcept(section.heading);

        if (!targetConceptId && conceptNodeIds.length > 0) {
          targetConceptId = conceptNodeIds[0];
        }

        if (!targetConceptId && allConcepts.length > 0) {
          targetConceptId = allConcepts[0].id;
        }

        if (!targetConceptId) continue;

        const content = section.content.join("\n");
        const fc = await tx.flashcard.create({
          data: {
            pergunta: `Explique: ${section.heading}`,
            resposta: content.slice(0, 500),
            conceitoId: targetConceptId,
            usuarioId: userId,
          },
        });

        // Spaced repetition
        const nextReview = new Date();
        await tx.aprendizadoFlashcard.create({
          data: {
            flashcardId: fc.id,
            usuarioId: userId,
            dificuldade: 5,
            intervalo: 0,
            proximaRevisao: nextReview,
            ultimaRevisao: nextReview,
            estagioAprendizado: 1,
          },
        });

        // Knowledge nodes
        const conceptNode = await tx.nodeConhecimento.findFirst({
          where: { tipoNode: "CONCEITO", referenciaId: targetConceptId },
        });
        const finalConceptNode = conceptNode ?? await tx.nodeConhecimento.create({
          data: { tipoNode: "CONCEITO", referenciaId: targetConceptId },
        });

        await tx.nodeConhecimento.create({
          data: { tipoNode: "FLASHCARD", referenciaId: fc.id },
        });

        const fcNode = await tx.nodeConhecimento.findFirst({
          where: { tipoNode: "FLASHCARD", referenciaId: fc.id },
        });

        if (fcNode) {
          await tx.conhecimentoAresta.create({
            data: {
              nodeOrigemId: fcNode.id,
              nodeDestinoId: finalConceptNode.id,
              tipoRelacao: "TESTA_DEFINICAO",
              peso: 0.9,
            },
          });

          await tx.conhecimentoAresta.create({
            data: {
              notaOrigemId: nota.id,
              nodeDestinoId: fcNode.id,
              tipoRelacao: "GERA",
              peso: 1.0,
            },
          });
        }

        flashcards.push({ id: fc.id, pergunta: fc.pergunta, conceitoId: targetConceptId });
      }
    }

    return { flashcards };
  });

  revalidatePath("/notes");
  revalidatePath("/flashcards");
  return result;
}
