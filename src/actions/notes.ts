"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { OpenAI } from "openai";
import { getCreateNotaUseCaseWithConcepts } from "@/modules/notas/adapters/nota-composer";
import { resolveAIConfig } from "@/actions/settings";
import { requireUserId } from "@/lib/auth";

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
  const userId = await requireUserId();

  return prisma.$transaction(async (tx) => {
    // 1. Create nota
    const rawText = `# ${input.titulo}\n\n${input.conteudo}`;
    const nota = await tx.nota.create({ data: { usuarioId: userId, textoBruto: rawText } });
    const notaNode = await tx.nodeConhecimento.create({ data: { tipoNode: "NOTA", referenciaId: nota.id, usuarioId: userId } });

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
      const existing = await tx.nodeConhecimento.findFirst({ where: { tipoNode: tipo as never, referenciaId: refId, usuarioId: userId } });
      if (existing) return existing.id;
      const created = await tx.nodeConhecimento.create({ data: { tipoNode: tipo as never, referenciaId: refId, usuarioId: userId } });
      return created.id;
    };

    const assuntoSet = new Set(conceitos.map((c) => c.topico?.assuntoId).filter(Boolean) as string[]);
    const topicoSet = new Set(conceitos.map((c) => c.topicoId).filter(Boolean) as string[]);

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
      if (cData?.topico?.assuntoId) {
        await ensureEdge(tx, assuntoNodeIds[cData.topico.assuntoId], topicoNodeIds[tId], "PERTENCE_A");
      }
    }

    // TOPICO -> CONCEITO (DEFINE)
    for (const c of conceitos) {
      if (c.topicoId) {
        await ensureEdge(tx, topicoNodeIds[c.topicoId], conceitoNodeIds[c.id], "DEFINE");
      }
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
// AI Analysis — Pipeline de 4 estagios
// ==========================================

async function callAI(messages: Array<{ role: "system" | "user"; content: string }>): Promise<string> {
  const aiConfig = await resolveAIConfig();
  if (!aiConfig.apiKey) {
    throw new Error("API key nao configurada. Configure em /settings.");
  }
  const openai = new OpenAI({
    apiKey: aiConfig.apiKey,
    baseURL: aiConfig.baseUrl,
  });
  const response = await openai.chat.completions.create({
    model: aiConfig.model,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages,
  });
  return response.choices[0]?.message?.content ?? "";
}

// --- Stage 1: Extract notes from raw text ---

export interface NotaCandidata {
  titulo: string;
  conteudo: string;
  conceitosPrevistos: string[]; // deprecated, mantido para compatibilidade
  conceitosDetalhe?: Array<{ nome: string }>;
}

export async function analyzeRawText(rawText: string): Promise<{ candidatas: NotaCandidata[] }> {
  if (!rawText.trim()) return { candidatas: [] };

  const content = await callAI([
    {
      role: "system",
      content: `Voce e um assistente de analise de texto educacional. Dado um texto bruto, identifique QUANTAS NOTAS fizerem sentido. Cada nota deve ter titulo e conteudo organizado.

Responda APENAS com JSON valido neste formato:
{"notas":[{"titulo":"Nome","conteudo":"Conteudo organizado"}]}
Sem markdown, sem explicacao fora do JSON.`,
    },
    { role: "user", content: rawText.slice(0, 15000) },
  ]);

  if (!content) return { candidatas: [] };

  try {
    const parsed = JSON.parse(content);
    const candidatas: NotaCandidata[] = (parsed.notas || []).map((n: Record<string, unknown>) => ({
      titulo: (n.titulo as string) || "Nota sem titulo",
      conteudo: (n.conteudo as string) || "",
      conceitosPrevistos: [],
    }));
    return { candidatas };
  } catch (e) {
    console.error("Parse error:", e, "Raw:", content?.slice(0, 500));
    return {
      candidatas: [{ titulo: "Nota", conteudo: rawText, conceitosPrevistos: [], conceitosDetalhe: [] }],
    };
  }
}

// --- Stage 2: Extract concepts and relations from selected notes ---

export interface ConceitoDetalhe {
  nome: string;
}

export interface IAConceitoRelacao {
  origem: string;
  destino: string;
  tipo: string;
}

export interface AnaliseConceitosResult {
  conceitos: ConceitoDetalhe[];
  conceitoRelacoes: IAConceitoRelacao[];
}

export async function extractConceitos(notaConteudos: Array<{ titulo: string; conteudo: string }>): Promise<AnaliseConceitosResult> {
  if (notaConteudos.length === 0) return { conceitos: [], conceitoRelacoes: [] };

  const existingConcepts = await prisma.conceito.findMany({
    include: { topico: { include: { assunto: true } } },
  });
  const contextList = existingConcepts.map((c) =>
    c.topico
      ? `${c.nome} (topico: ${c.topico.nome}, assunto: ${c.topico.assunto?.nome ?? ""})`
      : c.nome,
  ).join(", ");

  const texts = notaConteudos.map((n) => `NOTA: "${n.titulo}"\n${n.conteudo}`).join("\n\n---\n\n");

  const content = await callAI([
    {
      role: "system",
      content: `Voce e especialista em mapeamento conceitual educacional. Dado um conjunto de notas de estudo, identifique TODOS os CONCEITOS mencionados e as relacoes semanticas entre eles.

Conceitos ja existentes no banco para referencia: ${contextList}

Use os nomes existentes como referencia. Se encontrar conceitos novos legitimos, liste-os tambem.

Para cada relacao entre conceitos, use APENAS estes tipos:
IS_A, PART_OF, PREREQUISITO, DERIVA_DE, EVOLUI_PARA, REFORCA, ALTERNATIVA_A, CONTRASTA_COM, CONFUNDE_COM, ANTI_PADRAO_DE, MEDIDO_POR, OBJETIVO_DE, RELACIONADO, DEPENDE_DE, HERDA

Responda APENAS com JSON valido neste formato:
{"conceitos":[{"nome":"Conceito A"},{"nome":"Conceito B"}],"conceito_relacoes":[{"origem":"Conceito A","destino":"Conceito B","tipo":"IS_A"}]}
Sem markdown, sem explicacao fora do JSON.`,
    },
    { role: "user", content: texts.slice(0, 15000) },
  ]);

  if (!content) return { conceitos: [], conceitoRelacoes: [] };

  try {
    const parsed = JSON.parse(content);
    return {
      conceitos: (parsed.conceitos || []).map((c: Record<string, unknown>) => ({
        nome: (c.nome as string) || "Conceito desconhecido",
      })),
      conceitoRelacoes: (parsed.conceito_relacoes || []).map((r: Record<string, unknown>) => ({
        origem: (r.origem as string) || "",
        destino: (r.destino as string) || "",
        tipo: (r.tipo as string) || "RELACIONADO",
      })),
    };
  } catch (e) {
    console.error("Parse error:", e);
    return { conceitos: [], conceitoRelacoes: [] };
  }
}

// --- Stage 3: Extract topics from concepts ---

export interface IATopicoRelacao {
  origem: string;
  destino: string;
  tipo: string;
}

export interface AnaliseTopicosResult {
  topicos: Array<{ nome: string; conceitos: string[] }>;
  topicoRelacoes: IATopicoRelacao[];
}

export async function extractTopicos(
  conceitos: string[],
  notaConteudos: Array<{ titulo: string; conteudo: string }>,
): Promise<AnaliseTopicosResult> {
  const existingTopicos = await prisma.topico.findMany({
    include: { assunto: true },
  });
  const contextoTopicos = existingTopicos.map((t) =>
    t.assunto ? `${t.nome} (assunto: ${t.assunto.nome})` : t.nome,
  ).join(", ");

  const texts = notaConteudos.map((n) => `NOTA: "${n.titulo}"\n${n.conteudo}`).join("\n\n---\n\n");

  const conceptContext = conceitos.length > 0
    ? `\nConceitos a serem organizados: ${conceitos.join(", ")}`
    : "\nIdentifique os CONCEITOS mencionados no texto e agrupe-os em TOPICOS.";

  const content = await callAI([
    {
      role: "system",
      content: `Voce e especialista em organizacao curricular. Dado o conteudo das notas de estudo, identifique os TOPICOS abordados e agrupe os conceitos relevantes dentro de cada topico. Identifique tambem relacoes semanticas entre os topicos.

Topicos existentes no banco para referencia: ${contextoTopicos}
${conceptContext}

Use estes tipos para relacoes entre topicos: PERTENCE_A, SUBTOPICO_DE, DEPENDE_DE, FUNDAMENTA, APLICADO_EM, REFORCA, EVOLUI_PARA, RELACIONADO

Responda APENAS com JSON valido neste formato:
{"topicos":[{"nome":"Topico A","conceitos":["Conceito X","Conceito Y"]}],"topico_relacoes":[{"origem":"Topico A","destino":"Topico B","tipo":"DEPENDE_DE"}]}
Sem markdown, sem explicacao fora do JSON.`,
    },
    { role: "user", content: texts.slice(0, 15000) },
  ]);

  if (!content) return { topicos: [], topicoRelacoes: [] };

  try {
    const parsed = JSON.parse(content);
    return {
      topicos: (parsed.topicos || []).map((t: Record<string, unknown>) => ({
        nome: (t.nome as string) || "TopicoGeral",
        conceitos: (t.conceitos as string[]) || [],
      })),
      topicoRelacoes: (parsed.topico_relacoes || []).map((r: Record<string, unknown>) => ({
        origem: (r.origem as string) || "",
        destino: (r.destino as string) || "",
        tipo: (r.tipo as string) || "RELACIONADO",
      })),
    };
  } catch (e) {
    console.error("Parse error:", e);
    return { topicos: [], topicoRelacoes: [] };
  }
}

// --- Stage 4: Extract subjects (assuntos) from topics ---

export interface IAAssuntoRelacao {
  origem: string;
  destino: string;
  tipo: string;
}

export interface AnaliseAssuntosResult {
  assuntos: Array<{ nome: string; topicos: string[] }>;
  assuntoRelacoes: IAAssuntoRelacao[];
}

export async function extractAssuntos(
  topicos: string[],
  notaConteudos: Array<{ titulo: string; conteudo: string }>,
): Promise<AnaliseAssuntosResult> {
  const existingAssuntos = await prisma.assunto.findMany({
    where: { usuarioId: await requireUserId() },
  });
  const contextoAssuntos = existingAssuntos.map((a) => a.nome).join(", ");

  const texts = notaConteudos.map((n) => `NOTA: "${n.titulo}"\n${n.conteudo}`).join("\n\n---\n\n");

  const topicContext = topicos.length > 0
    ? `\nTopicos identificados: ${topicos.join(", ")}`
    : "\nIdentifique os TOPICOS e agrupe-os em ASSUNTOS (materias/disciplinas).";

  const content = await callAI([
    {
      role: "system",
      content: `Voce e especialista em organizacao curricular. Dado o conteudo das notas de estudo, identifique os ASSUNTOS (materias/disciplinas) abordados, agrupe os topicos relevantes dentro de cada assunto, e identifique relacoes semanticas entre os assuntos.

Assuntos existentes no banco para referencia: ${contextoAssuntos || "(nenhum, pode criar novos se necessario)"}${topicContext}

Use estes tipos para relacoes entre assuntos: RELACIONADO, PREREQUISITO, COMPLEMENTAR, APLICADO_EM, REFORCA

Responda APENAS com JSON valido neste formato:
{"assuntos":[{"nome":"Direito Constitucional","topicos":["Topico A","Topico B"]}],"assunto_relacoes":[{"origem":"Direito Constitucional","destino":"Direito Administrativo","tipo":"RELACIONADO"}]}
Sem markdown, sem explicacao fora do JSON.`,
    },
    { role: "user", content: texts.slice(0, 15000) },
  ]);

  if (!content) return { assuntos: [], assuntoRelacoes: [] };

  try {
    const parsed = JSON.parse(content);
    return {
      assuntos: (parsed.assuntos || []).map((a: Record<string, unknown>) => ({
        nome: (a.nome as string) || "AssuntoGeral",
        topicos: (a.topicos as string[]) || [],
      })),
      assuntoRelacoes: (parsed.assunto_relacoes || []).map((r: Record<string, unknown>) => ({
        origem: (r.origem as string) || "",
        destino: (r.destino as string) || "",
        tipo: (r.tipo as string) || "RELACIONADO",
      })),
    };
  } catch (e) {
    console.error("Parse error:", e);
    return { assuntos: [], assuntoRelacoes: [] };
  }
}

// --- Single optimized AI pipeline: one prompt for all hierarchy ---

export interface SaveSelectedNotaInput {
  titulo: string;
  conteudo: string;
}

export async function saveSelectedNotas(
  candidatas: SaveSelectedNotaInput[],
): Promise<{ notaIds: string[] }> {
  const userId = await requireUserId();
  const textsToAnalyze = candidatas.map((c) => ({ titulo: c.titulo, conteudo: c.conteudo }));

  // Load existing hierarchy for AI context
  const [existingConcepts, existingTopicos, existingAssuntos] = await Promise.all([
    prisma.conceito.findMany({ include: { topico: { include: { assunto: true } } } }),
    prisma.topico.findMany({ include: { assunto: true } }),
    prisma.assunto.findMany({ where: { usuarioId: userId } }),
  ]);

  const contextText = [
    existingAssuntos.length > 0 ? `ASSUNTOS: ${existingAssuntos.map(a => a.nome).join(", ")}` : "",
    existingTopicos.length > 0 ? `TOPICOS: ${existingTopicos.map(t => t.nome).join(", ")}` : "",
    existingConcepts.length > 0 ? `CONCEITOS: ${existingConcepts.map(c => c.nome).join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const texts = textsToAnalyze.map((n) => `NOTA: "${n.titulo}"\n${n.conteudo}`).join("\n\n---\n\n");

  // Single AI call — ask for everything at once
  const content = await callAI([
    {
      role: "system",
      content: `Voce e especialista em organizacao curricular e mapeamento de conhecimento. Dado um conjunto de notas de estudo, identifique:

1. CONCEITOS: todos os conceitos mencionados no texto
2. TOPICOS: grupos de conceitos relacionados, com os conceitos de cada topico
3. ASSUNTOS (materias): disciplinas que agrupam topicos
4. RELACOES entre cada nota e seus conceitos (como a nota aborda cada conceito)
5. RELACOES entre conceitos (relacoes semanticas diretas)
6. RELACOES entre topicos (relacoes semanticas ou de dependencia)
7. RELACOES entre assuntos (relacoes entre materias)

Voce DEVE usar EXATAMENTE estes tipos de relacao — invente nada alem disso:

NOTA -> CONCEITO (como a nota aborda o conceito):
  DEFINE: nota define/explica o conceito
  EXPLICA: nota detalha o funcionamento
  APROFUNDA: nota aprofunda aspectos do conceito
  EXEMPLIFICA: nota da exemplos praticos
  CONTRASTA: nota compara/contrasta o conceito
  SINTETIZA: nota resume/sintetiza o conceito
  ALERTA_ERRO: nota alerta sobre erros comuns

CONCEITO -> CONCEITO (relacao semantica direta):
  IS_A: conceito e um tipo de outro
  PART_OF: conceito e parte de outro
  PREREQUISITO: conceito e pre-requisito de outro
  DERIVA_DE: conceito deriva de outro
  EVOLUI_PARA: conceito evolui para outro
  REFORCA: conceito reforca outro
  ALTERNATIVA_A: conceito e alternativa de outro
  CONTRASTA_COM: conceitu contrasta com outro
  CONFUNDE_COM: conceito e frequentemente confundido com outro
  ANTI_PADRAO_DE: conceito e anti-padrao de outro
  MEDIDO_POR: conceito e medido por outro
  OBJETIVO_DE: conceito e objetivo de outro

CONCEITO -> TOPICO (conceito pertence a topico):
  PERTENCE_A: conceito pertence ao topico
  FUNDAMENTA: conceito fundamenta o topico
  APLICADO_EM: conceito e aplicado no topico

TOPICO -> TOPICO (relacao entre topicos):
  SUBTOPICO_DE: topico e subtopico de outro
  RELACIONADO: topico relacionado a outro
  DEPENDE_DE: topico depende de outro
  EVOLUI_PARA: topico evolui para outro

TOPICO -> ASSUNTO (topico pertence a materia):
  PERTENCE_A: topico pertence a materia
  APLICADO_EM: topico e aplicado na materia

ASSUNTO -> ASSUNTO (relacao entre materias):
  RELACIONADO: materias sao relacionadas
  DEPENDE_DE: materia depende de outra

Contexto existente no banco:
${contextText || "(nenhum, pode criar novos)"}

Responda APENAS com JSON valido neste formato:
{
  "conceitos": [{"nome":"Conceito A"},{"nome":"Conceito B"}],
  "nota_conceito_relacoes": [{"nota":"NOTA_TITULO","conceito":"Conceito A","tipo":"DEFINE"}],
  "conceito_relacoes": [{"origem":"Conceito A","destino":"Conceito B","tipo":"IS_A"}],
  "topicos": [{"nome":"Topico X","conceitos":["Conceito A","Conceito B"]}],
  "topico_relacoes": [{"origem":"Topico X","destino":"Topico Y","tipo":"DEPENDE_DE"}],
  "assuntos": [{"nome":"Direito","topicos":["Topico X","Topico Y"]}],
  "assunto_relacoes": [{"origem":"Direito","destino":"Filosofia","tipo":"RELACIONADO"}]
}
Sem markdown, sem explicacao fora do JSON.`,
    },
    { role: "user", content: texts.slice(0, 15000) },
  ]);

  if (!content) {
    console.error("AI returned no hierarchy response");
    return { notaIds: [] };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Parse error:", e, "Raw:", content?.slice(0, 500));
    return { notaIds: [] };
  }

  const conceitoResult: AnaliseConceitosResult = {
    conceitos: ((parsed.conceitos as any[]) || []).map((c) => ({ nome: c.nome || "Conceito" })),
    conceitoRelacoes: ((parsed.conceito_relacoes as any[]) || []).map((r) => ({
      origem: r.origem || "", destino: r.destino || "", tipo: r.tipo || "RELACIONADO",
    })),
  };

  const topicoResult: AnaliseTopicosResult = {
    topicos: ((parsed.topicos as any[]) || []).map((t) => ({
      nome: t.nome || "Topico", conceitos: (t.conceitos as string[]) || [],
    })),
    topicoRelacoes: ((parsed.topico_relacoes as any[]) || []).map((r) => ({
      origem: r.origem || "", destino: r.destino || "", tipo: r.tipo || "RELACIONADO",
    })),
  };

  const assuntoResult: AnaliseAssuntosResult = {
    assuntos: ((parsed.assuntos as any[]) || []).map((a) => ({
      nome: a.nome || "Assunto", topicos: (a.topicos as string[]) || [],
    })),
    assuntoRelacoes: ((parsed.assunto_relacoes as any[]) || []).map((r) => ({
      origem: r.origem || "", destino: r.destino || "", tipo: r.tipo || "RELACIONADO",
    })),
  };

  // Parse per-note concept relations
  const notaConceitoRels: Array<{ notaTitulo: string; conceito: string; tipo: string }> =
    ((parsed.nota_conceito_relacoes as any[]) || []).map((r) => ({
      notaTitulo: r.nota || "", conceito: r.conceito || "", tipo: r.tipo || "DEFINE",
    }));

  // Build everything in DB — pass per-note concept relations
  const result = await buildHierarquiaCompleta(
    userId,
    textsToAnalyze,
    conceitoResult,
    topicoResult,
    assuntoResult,
    notaConceitoRels,
  );

  return { notaIds: result.notaIds };
}

async function buildHierarquiaCompleta(
  userId: string,
  candidatas: Array<{ titulo: string; conteudo: string }>,
  conceitos: AnaliseConceitosResult,
  topicos: AnaliseTopicosResult,
  assuntos: AnaliseAssuntosResult,
  notaConceitoRels: Array<{ notaTitulo: string; conceito: string; tipo: string }>,
): Promise<{ notaIds: string[] }> {
  // Load existing DB entities for matching
  const [existingConcepts, existingTopicos, existingAssuntos] = await Promise.all([
    prisma.conceito.findMany({ include: { topico: { include: { assunto: true } } } }),
    prisma.topico.findMany({ include: { assunto: true } }),
    prisma.assunto.findMany({ where: { usuarioId: userId } }),
  ]);

  // Resolve or create assuntos
  const assuntoNameToId = new Map<string, string>();
  for (const a of existingAssuntos) assuntoNameToId.set(a.nome.toLowerCase(), a.id);

  // Create missing assuntos from AI output
  for (const a of assuntos.assuntos) {
    const key = a.nome.toLowerCase();
    const existing = existingAssuntos.find((x) => x.nome.toLowerCase() === key);
    if (existing) {
      assuntoNameToId.set(key, existing.id);
    } else {
      const newAssunto = await prisma.assunto.create({ data: { usuarioId: userId, nome: a.nome } });
      assuntoNameToId.set(key, newAssunto.id);
      existingAssuntos.push(newAssunto);
    }
  }

  // Resolve or create topicos
  const topicoNameToId = new Map<string, string>();
  const topicoNameToAssuntoId = new Map<string, string>();

  // First, match existing topics
  for (const t of existingTopicos) {
    const key = t.nome.toLowerCase();
    topicoNameToId.set(key, t.id);
    topicoNameToAssuntoId.set(key, t.assuntoId);
  }

  // Match AI topics to existing
  for (const topicoInfo of topicos.topicos) {
    const key = topicoInfo.nome.toLowerCase();
    if (!topicoNameToId.has(key)) {
      // Find assunto for this topic from AI grouping
      let assuntoId: string | null = null;
      for (const aGroup of assuntos.assuntos) {
        if (aGroup.topicos.some((tn) => tn.toLowerCase() === key)) {
          const aKey = aGroup.nome.toLowerCase();
          const aExisting = existingAssuntos.find((a) => a.nome.toLowerCase() === aKey);
          if (aExisting) { assuntoId = aExisting.id; break; }
        }
      }
      // Fallback to first available subject
      if (!assuntoId) {
        assuntoId = existingAssuntos[0]?.id;
        if (!assuntoId) {
          const ga = await prisma.assunto.create({ data: { usuarioId: userId, nome: "Geral" } });
          assuntoId = ga.id;
          existingAssuntos.push(ga);
        }
      }
      const newTopico = await prisma.topico.create({
        data: { assuntoId: assuntoId!, nome: topicoInfo.nome, usuarioId: userId },
      });
      topicoNameToId.set(key, newTopico.id);
      topicoNameToAssuntoId.set(key, assuntoId);
    }
  }

  // Resolve or create concepts
  const conceptNameToId = new Map<string, string>();
  const conceptNameToTopicoId = new Map<string, string>();

  for (const c of existingConcepts) {
    conceptNameToId.set(c.nome.toLowerCase(), c.id);
    if (c.topicoId) conceptNameToTopicoId.set(c.nome.toLowerCase(), c.topicoId);
  }

  // Match AI concepts to topics
  for (const topicoInfo of topicos.topicos) {
    const tKey = topicoInfo.nome.toLowerCase();
    const tid = topicoNameToId.get(tKey);
    if (!tid) continue;

    for (const cName of topicoInfo.conceitos) {
      const cKey = cName.toLowerCase();
      if (conceptNameToId.has(cKey)) continue;

      const existing = existingConcepts.find((c) => c.nome.toLowerCase() === cKey);
      if (existing) {
        conceptNameToId.set(cKey, existing.id);
        if (existing.topicoId) conceptNameToTopicoId.set(cKey, existing.topicoId);
      } else {
        const newConcept = await prisma.conceito.create({
          data: { topicoId: tid, nome: cName, usuarioId: userId },
        });
        conceptNameToId.set(cKey, newConcept.id);
        conceptNameToTopicoId.set(cKey, tid);
      }
    }
  }

  // Also handle standalone concepts (from conceitoResult but not in any topic)
  for (const cd of conceitos.conceitos) {
    const cKey = cd.nome.toLowerCase();
    if (conceptNameToId.has(cKey)) continue;

    const existing = existingConcepts.find((c) => c.nome.toLowerCase() === cKey);
    if (existing) {
      conceptNameToId.set(cKey, existing.id);
      if (existing.topicoId) conceptNameToTopicoId.set(cKey, existing.topicoId);
    } else {
      // Create under first topic or "Geral"
      let tid = topicoNameToId.values().next().value as string | undefined;
      if (!tid) {
        let assuntoId = existingAssuntos[0]?.id;
        if (!assuntoId) {
          const ga = await prisma.assunto.create({ data: { usuarioId: userId, nome: "Geral" } });
          assuntoId = ga.id;
        }
        const gt = await prisma.topico.create({ data: { assuntoId: assuntoId!, nome: "Geral", usuarioId: userId } });
        tid = gt.id;
        topicoNameToId.set("geral", tid);
      }
      const newConcept = await prisma.conceito.create({
        data: { topicoId: tid, nome: cd.nome, usuarioId: userId },
      });
      conceptNameToId.set(cKey, newConcept.id);
      conceptNameToTopicoId.set(cKey, tid);
    }
  }

  // Now create notes and graph nodes
  // Group concept relations by note
  const notaConceptsMap = new Map<string, Set<string>>(); // notaTitulo -> concept IDs
  const notaConceitoTypeMap = new Map<string, NotaConceitoRel[]>(); // notaTitulo -> relations
  for (const rel of notaConceitoRels) {
    const cId = conceptNameToId.get(rel.conceito.toLowerCase());
    if (!cId) continue;
    if (!notaConceptsMap.has(rel.notaTitulo)) notaConceptsMap.set(rel.notaTitulo, new Set());
    notaConceptsMap.get(rel.notaTitulo)!.add(cId);

    if (!notaConceitoTypeMap.has(rel.notaTitulo)) notaConceitoTypeMap.set(rel.notaTitulo, []);
    notaConceitoTypeMap.get(rel.notaTitulo)!.push({ conceitoId: cId, tipoRelacao: rel.tipo });
  }

  // Cross-note concept relations (from conceitoRelacoes)
  const conceitoConceitoRels: ConceitoConceitoRel[] = [];
  for (const rel of conceitos.conceitoRelacoes) {
    const oId = conceptNameToId.get(rel.origem.toLowerCase());
    const dId = conceptNameToId.get(rel.destino.toLowerCase());
    if (oId && dId) {
      conceitoConceitoRels.push({ origemId: oId, destinoId: dId, tipoRelacao: rel.tipo });
    }
  }

  const notaIds: string[] = [];

  for (const candidata of candidatas) {
    // Match note title to AI response (case-insensitive substring match)
    const titleLower = candidata.titulo.toLowerCase();
    const matchedNotaKey = [...notaConceitoTypeMap.keys()].find(
      (k) => k.toLowerCase() === titleLower || k.toLowerCase().includes(titleLower) || titleLower.includes(k.toLowerCase()),
    );

    const concepts = notaConceptsMap.get(matchedNotaKey || candidata.titulo) || new Set<string>();
    const noteRels = notaConceitoTypeMap.get(matchedNotaKey || candidata.titulo) || [];

    const { notaId } = await createNotaManual({
      titulo: candidata.titulo,
      conteudo: candidata.conteudo,
      selectedConceitoIds: concepts.size > 0 ? Array.from(concepts) : Array.from(conceptNameToId.values()).slice(0, 5), // fallback: use first 5
      notaConceitoRels: noteRels.length > 0 ? noteRels : undefined,
      conceitoConceitoRels: conceitoConceitoRels.length > 0 ? conceitoConceitoRels : undefined,
    });
    notaIds.push(notaId);
  }

  // Create inter-entity edges (topic->topic, assunto->assunto, concept->concept)
  // These need graph node IDs, so we do it in a separate transaction
  await createSemanticEdges(
    userId,
    conceitos.conceitoRelacoes,
    topicos.topicoRelacoes,
    assuntos.assuntoRelacoes,
    conceptNameToId,
    topicoNameToId,
    assuntoNameToId,
  );

  revalidatePath("/notes");
  revalidatePath("/graph");

  return { notaIds };
}

async function createSemanticEdges(
  userId: string,
  conceptRels: IAConceitoRelacao[],
  topicRels: IATopicoRelacao[],
  subjectRels: IAAssuntoRelacao[],
  conceptNameToId: Map<string, string>,
  topicoNameToId: Map<string, string>,
  assuntoNameToId: Map<string, string>,
): Promise<void> {
  const buildNode = async (tx: any, tipo: string, refId: string): Promise<string> => {
    const existing = await tx.nodeConhecimento.findFirst({
      where: { tipoNode: tipo as never, referenciaId: refId, usuarioId: userId },
    });
    if (existing) return existing.id;
    const created = await tx.nodeConhecimento.create({
      data: { tipoNode: tipo as never, referenciaId: refId, usuarioId: userId },
    });
    return created.id;
  };

  await prisma.$transaction(async (tx) => {
    // Concept -> Concept edges
    for (const rel of conceptRels) {
      const oId = conceptNameToId.get(rel.origem.toLowerCase());
      const dId = conceptNameToId.get(rel.destino.toLowerCase());
      if (!oId || !dId || oId === dId) continue;
      const oNode = await buildNode(tx, "CONCEITO", `conceito-${oId}`);
      const dNode = await buildNode(tx, "CONCEITO", `conceito-${dId}`);
      await ensureEdge(tx, oNode, dNode, rel.tipo);
    }

    // Topic -> Topic edges
    for (const rel of topicRels) {
      const oId = topicoNameToId.get(rel.origem.toLowerCase());
      const dId = topicoNameToId.get(rel.destino.toLowerCase());
      if (!oId || !dId || oId === dId) continue;
      const oNode = await buildNode(tx, "TOPICO", `topico-${oId}`);
      const dNode = await buildNode(tx, "TOPICO", `topico-${dId}`);
      await ensureEdge(tx, oNode, dNode, rel.tipo);
    }

    // Subject -> Subject edges
    for (const rel of subjectRels) {
      const oId = assuntoNameToId.get(rel.origem.toLowerCase());
      const dId = assuntoNameToId.get(rel.destino.toLowerCase());
      if (!oId || !dId || oId === dId) continue;
      const oNode = await buildNode(tx, "ASSUNTO", `assunto-${oId}`);
      const dNode = await buildNode(tx, "ASSUNTO", `assunto-${dId}`);
      await ensureEdge(tx, oNode, dNode, rel.tipo);
    }
  });
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
  const userId = await requireUserId();

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
      data: { tipoNode: "NOTA", referenciaId: `rawtext-${nota.id}`, usuarioId: userId },
    });
    createdNodes++;

    // ── 3. Create note graph node
    const notaNode = await tx.nodeConhecimento.create({
      data: { tipoNode: "NOTA", referenciaId: nota.id, usuarioId: userId },
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
        where: { tipoNode: "ASSUNTO", referenciaId: `assunto-${assuntoId}`, usuarioId: userId },
      });
      const nodeId = existingNode?.id ?? (await tx.nodeConhecimento.create({
        data: { tipoNode: "ASSUNTO", referenciaId: `assunto-${assuntoId}`, usuarioId: userId },
      })).id;
      if (!existingNode) createdNodes++;
      assuntoNodeId.set(assuntoId, nodeId);
    }

    // ── 8. Create TOPICO nodes + link ASSUNTO → TOPICO
    const topicoNodeId = new Map<string, string>();

    for (const topicoId of topicosSet) {
      const existingNode = await tx.nodeConhecimento.findFirst({
        where: { tipoNode: "TOPICO", referenciaId: `topico-${topicoId}`, usuarioId: userId },
      });
      const nodeId = existingNode?.id ?? (await tx.nodeConhecimento.create({
        data: { tipoNode: "TOPICO", referenciaId: `topico-${topicoId}`, usuarioId: userId },
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
        where: { tipoNode: "CONCEITO", referenciaId: refId, usuarioId: userId },
      });
      const cNodeId = existingNode?.id ?? (await tx.nodeConhecimento.create({
        data: { tipoNode: "CONCEITO", referenciaId: refId, usuarioId: userId },
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
  const userId = await requireUserId();

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
  const userId = await requireUserId();

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
  const userId = await requireUserId();

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
  const userId = await requireUserId();
  await prisma.nota.delete({ where: { id, usuarioId: userId } });
  revalidatePath("/notes");
  return { success: true };
}

export async function deleteAllNotas(): Promise<{ count: number }> {
  const userId = await requireUserId();
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
  const userId = await requireUserId();

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
          where: { tipoNode: "CONCEITO", referenciaId: targetConceptId, usuarioId: userId },
        });
        const finalConceptNode = conceptNode ?? await tx.nodeConhecimento.create({
          data: { tipoNode: "CONCEITO", referenciaId: targetConceptId, usuarioId: userId },
        });

        // Create flashcard node
        await tx.nodeConhecimento.create({
          data: { tipoNode: "FLASHCARD", referenciaId: fc.id, usuarioId: userId },
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
              notaDestinoId: nota.id,
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
          where: { tipoNode: "CONCEITO", referenciaId: targetConceptId, usuarioId: userId },
        });
        const finalConceptNode = conceptNode ?? await tx.nodeConhecimento.create({
          data: { tipoNode: "CONCEITO", referenciaId: targetConceptId, usuarioId: userId },
        });

        await tx.nodeConhecimento.create({
          data: { tipoNode: "FLASHCARD", referenciaId: fc.id, usuarioId: userId },
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
