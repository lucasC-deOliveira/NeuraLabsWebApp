"use server";

import { OpenAI } from "openai";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveAIConfig } from "@/actions/settings";
import { addNodeToGraph, createEdge } from "@/actions/graph";
import type { TipoRelacao } from "@/lib/graph";
import {
  getAllowedRelations,
  isRelationAllowed,
  getInsightTargets,
  getCanonicalDirection,
} from "@/modules/graph/domain/services/relation-rules";

export interface NotaRelationSuggestion {
  nodeId: string;
  nodeTipo: "ASSUNTO" | "TOPICO" | "CONCEITO";
  nodeNome: string;
  relacao: string;
  motivo: string;
}

export interface NodeInsight {
  categoria: string;
  titulo: string;
  descricao: string;
  // como o insight entra no grafo: novo nó deste tipo, ligado por esta relação
  tipoNo: string;
  relacao: string;
}

export interface NodeInsightsResult {
  nodeNome: string;
  nodeTipo: string;
  insights: NodeInsight[];
}

// categorias sugeridas para os insights (a IA escolhe entre elas)
const INSIGHT_CATEGORIES = ["Relacionado", "Aprofundar", "Conexão", "Lacuna", "Aplicação"];

const TIPO_LABEL: Record<string, string> = {
  ASSUNTO: "assunto",
  TOPICO: "tópico",
  CONCEITO: "conceito",
  NOTA: "nota",
  FLASHCARD: "flashcard",
  TEXTO_BRUTO: "texto",
  BARALHO: "baralho",
};

// Gera insights (IA) para UM nó: o que pode se relacionar/aprofundar com base
// no conteúdo do nó e no contexto do grafo (demais nós existentes).
export async function generateNodeInsights(
  grafoId: string,
  nodeId: string,
): Promise<NodeInsightsResult> {
  const userId = await requireUserId();

  // tipo do nó-alvo dentro deste grafo
  const target = await prisma.nodeConhecimento.findFirst({
    where: { grafoId, usuarioId: userId, referenciaId: nodeId },
    select: { tipoNode: true, referenciaId: true },
  });
  if (!target) throw new Error("Nó não encontrado neste grafo.");

  // carrega nomes/descrições de todos os nós do grafo (contexto) e o conteúdo do alvo
  const graphNodes = await prisma.nodeConhecimento.findMany({
    where: { grafoId, usuarioId: userId },
    select: { tipoNode: true, referenciaId: true },
  });

  const idsByType: Record<string, string[]> = {};
  for (const n of graphNodes) (idsByType[n.tipoNode] ??= []).push(n.referenciaId);

  const [assuntos, topicos, conceitos, notas, flashcards] = await Promise.all([
    prisma.assunto.findMany({ where: { id: { in: idsByType.ASSUNTO ?? [] } }, select: { id: true, nome: true, descricao: true } }),
    prisma.topico.findMany({ where: { id: { in: idsByType.TOPICO ?? [] } }, select: { id: true, nome: true, descricao: true } }),
    prisma.conceito.findMany({ where: { id: { in: idsByType.CONCEITO ?? [] } }, select: { id: true, nome: true, descricao: true } }),
    prisma.nota.findMany({ where: { id: { in: idsByType.NOTA ?? [] } }, select: { id: true, titulo: true, conteudo: true } }),
    prisma.flashcard.findMany({ where: { id: { in: idsByType.FLASHCARD ?? [] } }, select: { id: true, pergunta: true, resposta: true } }),
  ]);

  type Ctx = { id: string; tipo: string; nome: string; corpo?: string };
  const ctx = new Map<string, Ctx>();
  for (const a of assuntos) ctx.set(a.id, { id: a.id, tipo: "ASSUNTO", nome: a.nome, corpo: a.descricao ?? undefined });
  for (const t of topicos) ctx.set(t.id, { id: t.id, tipo: "TOPICO", nome: t.nome, corpo: t.descricao ?? undefined });
  for (const c of conceitos) ctx.set(c.id, { id: c.id, tipo: "CONCEITO", nome: c.nome, corpo: c.descricao ?? undefined });
  for (const n of notas) ctx.set(n.id, { id: n.id, tipo: "NOTA", nome: n.titulo || "Nota", corpo: n.conteudo });
  for (const f of flashcards) ctx.set(f.id, { id: f.id, tipo: "FLASHCARD", nome: f.pergunta, corpo: f.resposta });

  const alvo = ctx.get(nodeId);
  if (!alvo) throw new Error("Conteúdo do nó não encontrado.");

  // contexto do grafo: demais nós (nome + tipo), limitado para conter tokens
  const contextoLista = [...ctx.values()]
    .filter((c) => c.id !== nodeId)
    .slice(0, 100)
    .map((c) => `- [${TIPO_LABEL[c.tipo] ?? c.tipo}] ${c.nome}`)
    .join("\n");

  // combos válidos (tipo de nó + relação) para o insight virar um nó no grafo
  const targets = getInsightTargets(target.tipoNode);
  const targetsDesc = targets
    .map((t) => `- tipoNo "${t.tipo}" → relacoes possíveis: ${t.relacoes.join(", ")}`)
    .join("\n");
  // fallback acionável padrão (primeiro combo válido)
  const defaultCombo = targets[0]
    ? { tipoNo: targets[0].tipo, relacao: targets[0].relacoes[0] }
    : null;

  const aiConfig = await resolveAIConfig();
  if (!aiConfig.apiKey) {
    throw new Error("API key não configurada. Configure em /settings.");
  }
  const openai = new OpenAI({ apiKey: aiConfig.apiKey, baseURL: aiConfig.baseUrl });

  const tipoAlvo = TIPO_LABEL[alvo.tipo] ?? alvo.tipo;
  const response = await openai.chat.completions.create({
    model: aiConfig.model,
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Você é um tutor que analisa um nó de um grafo de conhecimento de estudo e gera INSIGHTS sobre o que pode se relacionar com ele, ajudando o aluno a expandir e conectar o conhecimento. Cada insight deve poder virar um NÓ no grafo.

Cada insight tem:
- categoria: uma de [${INSIGHT_CATEGORIES.join(", ")}] (Relacionado = conceito/tema próximo; Aprofundar = como ir além; Conexão = ligação com algo já no grafo; Lacuna = o que falta estudar; Aplicação = uso prático).
- titulo: curto e específico (será o NOME do novo nó; 3 a 8 palavras).
- descricao: 1 a 2 frases explicando a relevância (será a descrição do nó).
- tipoNo: o tipo do nó a criar, e relacao: como ele se liga ao nó-alvo. Escolha SOMENTE entre os combos válidos abaixo:
${targetsDesc}

Regras:
- Baseie-se no conteúdo do nó E no contexto do grafo fornecido.
- tipoNo e relacao DEVEM ser um dos combos válidos listados.
- Seja específico ao conteúdo; nada genérico.
- Entre 4 e 8 insights, ordenados do mais útil ao menos.
- Responda em JSON: {"insights":[{"categoria":"...","titulo":"...","descricao":"...","tipoNo":"...","relacao":"..."}]}`,
      },
      {
        role: "user",
        content: `NÓ-ALVO (${tipoAlvo}): ${alvo.nome}
${alvo.corpo ? `Conteúdo:\n${alvo.corpo.slice(0, 3000)}` : "(sem conteúdo textual)"}

CONTEXTO DO GRAFO (outros nós existentes):
${contextoLista || "(grafo sem outros nós)"}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("A IA retornou uma resposta inválida. Tente novamente.");
  }

  const insights: NodeInsight[] = [];
  for (const i of parsed?.insights ?? []) {
    const titulo = typeof i?.titulo === "string" ? i.titulo.trim() : "";
    if (!titulo) continue;
    const categoria =
      typeof i?.categoria === "string" && INSIGHT_CATEGORIES.includes(i.categoria)
        ? i.categoria
        : "Relacionado";

    // valida o combo tipoNo+relacao; se inválido, coage para o padrão acionável
    let tipoNo = typeof i?.tipoNo === "string" ? i.tipoNo : "";
    let relacao = typeof i?.relacao === "string" ? i.relacao : "";
    if (!isRelationAllowed(target.tipoNode, tipoNo, relacao)) {
      if (!defaultCombo) continue; // sem combo válido → não é acionável, descarta
      tipoNo = defaultCombo.tipoNo;
      relacao = defaultCombo.relacao;
    }

    insights.push({
      categoria,
      titulo,
      descricao: typeof i?.descricao === "string" ? i.descricao.trim() : "",
      tipoNo,
      relacao,
    });
    if (insights.length >= 8) break;
  }

  return { nodeNome: alvo.nome, nodeTipo: alvo.tipo, insights };
}

// Adiciona os insights escolhidos ao grafo: cada um vira um nó (Assunto/Tópico/
// Conceito) ligado ao nó-alvo pela relação sugerida. Reusa nós já existentes de
// mesmo tipo+nome (evita duplicar) e respeita a direção canônica das relações.
export async function addInsightsToGraph(
  grafoId: string,
  sourceNodeId: string,
  insights: Array<{ tipoNo: string; relacao: string; titulo: string; descricao?: string }>,
): Promise<{ added: number }> {
  const userId = await requireUserId();

  const source = await prisma.nodeConhecimento.findFirst({
    where: { grafoId, usuarioId: userId, referenciaId: sourceNodeId },
    select: { tipoNode: true },
  });
  if (!source) throw new Error("Nó de origem não encontrado neste grafo.");
  const sourceType = source.tipoNode;

  // índice nome→id dos nós de conhecimento já no grafo (para não duplicar)
  const existing = await prisma.nodeConhecimento.findMany({
    where: { grafoId, usuarioId: userId, tipoNode: { in: ["ASSUNTO", "TOPICO", "CONCEITO"] } },
    select: { tipoNode: true, referenciaId: true },
  });
  const idsByType: Record<string, string[]> = {};
  for (const e of existing) (idsByType[e.tipoNode] ??= []).push(e.referenciaId);
  const [exAssuntos, exTopicos, exConceitos] = await Promise.all([
    prisma.assunto.findMany({ where: { id: { in: idsByType.ASSUNTO ?? [] } }, select: { id: true, nome: true } }),
    prisma.topico.findMany({ where: { id: { in: idsByType.TOPICO ?? [] } }, select: { id: true, nome: true } }),
    prisma.conceito.findMany({ where: { id: { in: idsByType.CONCEITO ?? [] } }, select: { id: true, nome: true } }),
  ]);
  const nameIndex = new Map<string, string>();
  for (const a of exAssuntos) nameIndex.set(`ASSUNTO|${a.nome.toLowerCase()}`, a.id);
  for (const t of exTopicos) nameIndex.set(`TOPICO|${t.nome.toLowerCase()}`, t.id);
  for (const c of exConceitos) nameIndex.set(`CONCEITO|${c.nome.toLowerCase()}`, c.id);

  let added = 0;
  for (const ins of insights) {
    const titulo = (ins.titulo ?? "").trim();
    if (!titulo) continue;
    if (!isRelationAllowed(sourceType, ins.tipoNo, ins.relacao)) continue;
    const dir = getCanonicalDirection(sourceType, ins.tipoNo, ins.relacao);
    if (!dir) continue;

    // dedup: reusa nó existente do mesmo tipo+nome, senão cria um novo
    const key = `${ins.tipoNo}|${titulo.toLowerCase()}`;
    let targetRef = nameIndex.get(key) ?? null;
    if (!targetRef) {
      const res = await addNodeToGraph(grafoId, ins.tipoNo, { nome: titulo, descricao: ins.descricao ?? "" });
      targetRef = res.nodeId;
      nameIndex.set(key, targetRef);
    }

    // direção canônica: dir = [origemTipo, destinoTipo]
    const sourceIsOrigem = dir[0] === sourceType;
    const origemRef = sourceIsOrigem ? sourceNodeId : targetRef;
    const destinoRef = sourceIsOrigem ? targetRef : sourceNodeId;

    try {
      await createEdge(grafoId, {
        sourceNodeId: origemRef,
        targetNodeId: destinoRef,
        tipoRelacao: ins.relacao as TipoRelacao,
      });
      added++;
    } catch {
      // aresta duplicada/invalida: ignora (o nó já entrou no grafo)
    }
  }

  return { added };
}

// Analisa título + conteúdo da nota no contexto do grafo e sugere relações
// com conceitos, tópicos e assuntos — apenas relações permitidas pela legenda.
export async function suggestNotaRelations(
  grafoId: string,
  titulo: string,
  conteudo: string
): Promise<NotaRelationSuggestion[]> {
  const userId = await requireUserId();

  if (!titulo.trim() && !conteudo.trim()) return [];

  // candidatos: nós do grafo dos tipos que podem se relacionar com NOTA
  const graphNodes = await prisma.nodeConhecimento.findMany({
    where: {
      grafoId,
      usuarioId: userId,
      tipoNode: { in: ["ASSUNTO", "TOPICO", "CONCEITO"] },
    },
    select: { tipoNode: true, referenciaId: true },
  });
  if (graphNodes.length === 0) return [];

  const idsByType: Record<string, string[]> = { ASSUNTO: [], TOPICO: [], CONCEITO: [] };
  for (const n of graphNodes) idsByType[n.tipoNode]?.push(n.referenciaId);

  const [assuntos, topicos, conceitos] = await Promise.all([
    prisma.assunto.findMany({
      where: { id: { in: idsByType.ASSUNTO }, usuarioId: userId },
      select: { id: true, nome: true, descricao: true },
    }),
    prisma.topico.findMany({
      where: { id: { in: idsByType.TOPICO }, usuarioId: userId },
      select: { id: true, nome: true, descricao: true },
    }),
    prisma.conceito.findMany({
      where: { id: { in: idsByType.CONCEITO }, usuarioId: userId },
      select: { id: true, nome: true, descricao: true },
    }),
  ]);

  const candidates = [
    ...assuntos.map((a) => ({ id: a.id, tipo: "ASSUNTO" as const, nome: a.nome, descricao: a.descricao })),
    ...topicos.map((t) => ({ id: t.id, tipo: "TOPICO" as const, nome: t.nome, descricao: t.descricao })),
    ...conceitos.map((c) => ({ id: c.id, tipo: "CONCEITO" as const, nome: c.nome, descricao: c.descricao })),
  ];
  if (candidates.length === 0) return [];

  const candidateList = candidates
    .map((c) => `- id: ${c.id} | tipo: ${c.tipo} | nome: ${c.nome}${c.descricao ? ` | descricao: ${c.descricao}` : ""}`)
    .join("\n");

  const allowedByType = (["CONCEITO", "TOPICO", "ASSUNTO"] as const)
    .map((t) => `- NOTA → ${t}: ${getAllowedRelations("NOTA", t).join(", ")}`)
    .join("\n");

  const aiConfig = await resolveAIConfig();
  if (!aiConfig.apiKey) {
    throw new Error("API key não configurada. Configure em /settings.");
  }
  const openai = new OpenAI({ apiKey: aiConfig.apiKey, baseURL: aiConfig.baseUrl });

  const response = await openai.chat.completions.create({
    model: aiConfig.model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Você analisa uma nota de estudo (método Zettelkasten) e sugere relações com nós existentes de um grafo de conhecimento.

Relações permitidas (a nota é sempre a origem):
${allowedByType}

Significados (nota → conceito): DEFINE (a nota define o conceito), EXPLICA, APROFUNDA, EXEMPLIFICA (dá exemplos), CONTRASTA, SINTETIZA (resume vários aspectos), ALERTA_ERRO (aponta erro comum). Para tópicos e assuntos use PERTENCE_A (a nota pertence àquele contexto).

Regras:
- Sugira APENAS nós da lista de candidatos, referenciados pelo id exato.
- Use APENAS relações permitidas para o tipo do nó.
- Sugira no máximo 8 relações, só as realmente pertinentes ao conteúdo.
- Responda em JSON: {"sugestoes":[{"nodeId":"...","relacao":"...","motivo":"frase curta"}]}`,
      },
      {
        role: "user",
        content: `NOTA:
Título: ${titulo}
Conteúdo:
${conteudo.slice(0, 4000)}

CANDIDATOS DO GRAFO:
${candidateList}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("A IA retornou uma resposta inválida. Tente novamente.");
  }

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const suggestions: NotaRelationSuggestion[] = [];

  for (const s of parsed?.sugestoes ?? []) {
    const candidate = byId.get(s?.nodeId);
    if (!candidate || seen.has(candidate.id)) continue;
    // a legenda manda: descarta relações fora das regras
    if (!isRelationAllowed("NOTA", candidate.tipo, s?.relacao)) continue;
    seen.add(candidate.id);
    suggestions.push({
      nodeId: candidate.id,
      nodeTipo: candidate.tipo,
      nodeNome: candidate.nome,
      relacao: s.relacao,
      motivo: typeof s?.motivo === "string" ? s.motivo : "",
    });
    if (suggestions.length >= 8) break;
  }

  return suggestions;
}
