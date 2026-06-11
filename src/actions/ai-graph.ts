"use server";

import { OpenAI } from "openai";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveAIConfig } from "@/actions/settings";
import {
  getAllowedRelations,
  isRelationAllowed,
} from "@/modules/graph/domain/services/relation-rules";

export interface NotaRelationSuggestion {
  nodeId: string;
  nodeTipo: "ASSUNTO" | "TOPICO" | "CONCEITO";
  nodeNome: string;
  relacao: string;
  motivo: string;
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
