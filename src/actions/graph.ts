"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildKnowledgeGraph, getCriticalNodes as libGetCriticalNodes, type GraphNode, type GraphEdge, type TipoRelacao } from "@/lib/graph";
import { getAllowedRelations, isRelationAllowed } from "@/modules/graph/domain/services/relation-rules";
import { getGraphStore, isMarkdownMode } from "@/modules/graph/infra/store";

// fluxos ainda não migrados para o backend de arquivos
const MARKDOWN_NOT_SUPPORTED =
  "Esta operação ainda não está disponível no modo de armazenamento em arquivos (Markdown).";

export interface GraphNodeType {
  id: string;
  label: string;
  type: "ASSUNTO" | "TOPICO" | "CONCEITO" | "FLASHCARD" | "NOTA" | "TEXTO_BRUTO" | "BARALHO";
  nivelDominio: number;
  prioridadeRevisao: number;
  parentId?: string;
  pergunta?: string;
  posicaoX?: number;
  posicaoY?: number;
}

export interface GraphEdgeType {
  source: string;
  target: string;
  type: string;
  peso: number;
}

export interface GrafosConhecimento {
  id: string;
  nome: string;
  descricao?: string;
  dataCriacao: string;
  dataAtualizacao: string;
}

interface VisualState {
  zoom: number;
  pan: { x: number; y: number };
  positions: Record<string, { x: number; y: number }>;
}

// --- Graph management ---

export async function listUserGraphs(): Promise<GrafosConhecimento[]> {
  const userId = await requireUserId();
  const graphs = await prisma.grafosConhecimento.findMany({
    where: { usuarioId: userId },
    orderBy: { dataAtualizacao: "desc" },
  });
  return graphs.map((g) => ({
    id: g.id,
    nome: g.nome,
    descricao: g.descricao ?? undefined,
    dataCriacao: g.dataCriacao.toISOString(),
    dataAtualizacao: g.dataAtualizacao.toISOString(),
  }));
}

export async function createGrafo(nome: string, descricao?: string): Promise<{ id: string }> {
  const userId = await requireUserId();
  const grafo = await prisma.grafosConhecimento.create({
    data: { usuarioId: userId, nome, descricao: descricao ?? null },
  });
  return { id: grafo.id };
}

export async function deleteGrafo(grafoId: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.grafosConhecimento.deleteMany({
    where: { id: grafoId, usuarioId: userId },
  });
  revalidatePath("/graph");
}

// --- Node position saving ---

export async function saveGraphPositions(grafoId: string, positions: Record<string, { x: number; y: number }>): Promise<void> {
  const userId = await requireUserId();
  if (!grafoId || Object.keys(positions).length === 0) return;
  const store = await getGraphStore();
  await store.savePositions(userId, grafoId, positions);
}

// Also save visual state (zoom, pan, positions) as JSON
export async function saveGraphVisualState(grafoId: string, state: { zoom: number; pan: { x: number; y: number } }) {
  const userId = await requireUserId();
  const grafos = await prisma.grafosConhecimento.findUnique({ where: { id: grafoId, usuarioId: userId } });
  if (!grafos) return;

  // Build positions object from existing nodes
  const nodes = await prisma.nodeConhecimento.findMany({
    where: { grafoId },
    select: { id: true, referenciaId: true, posicaoX: true, posicaoY: true },
  });

  const positions: Record<string, { x: number; y: number }> = {};
  for (const n of nodes) {
    positions[n.referenciaId] = { x: n.posicaoX ?? 0, y: n.posicaoY ?? 0 };
  }

  const visualState: VisualState = { zoom: state.zoom, pan: state.pan, positions };

  await prisma.grafosConhecimento.update({
    where: { id: grafoId, usuarioId: userId },
    data: { estadoVisual: JSON.stringify(visualState) },
  });
}

export async function loadGraphVisualState(grafoId: string): Promise<{ positions: Record<string, { x: number; y: number }>; zoom: number; pan: { x: number; y: number } } | null> {
  const userId = await requireUserId();
  const grafo = await prisma.grafosConhecimento.findUnique({ where: { id: grafoId, usuarioId: userId } });
  if (!grafo || !grafo.estadoVisual) return null;

  try {
    return JSON.parse(grafo.estadoVisual);
  } catch {
    return null;
  }
}

// --- Core graph data ---

export async function getGraphNodes(grafoId?: string): Promise<{
  nodes: GraphNodeType[];
  edges: GraphEdgeType[];
}> {
  const userId = await requireUserId();
  const store = await getGraphStore();
  const result = await store.loadGraph(userId, grafoId);

  // posições salvas (banco: coluna do nó; markdown: frontmatter)
  const savedPositions = grafoId ? await store.getPositions(userId, grafoId) : {};

  const nodes: GraphNodeType[] = result.nodes.map((n) => {
    const refId = n.id.includes(":") ? n.id.split(":").slice(1).join(":") : n.id;
    const pos = savedPositions[refId];
    return {
      id: n.id,
      label: n.label,
      type: n.type,
      nivelDominio: n.nivelDominio,
      prioridadeRevisao: n.prioridadeRevisao,
      parentId: n.parentId,
      pergunta: n.pergunta,
      posicaoX: pos?.x,
      posicaoY: pos?.y,
    };
  });

  const edges: GraphEdgeType[] = result.edges.map((e) => ({
    source: e.source,
    target: e.target,
    type: e.type,
    peso: e.peso,
  }));

  return { nodes, edges };
}

// Busca por CONTEÚDO sob demanda: roda no servidor e devolve só os
// referenciaIds (= ids dos nós do layout) cujo corpo casa com o termo.
// O conteúdo nunca é enviado ao cliente — o grafo continua leve mesmo
// com notas/textos grandes (e, no futuro, vídeo/imagens).
export async function searchGraphNodeContent(
  grafoId: string,
  query: string,
): Promise<string[]> {
  const userId = await requireUserId();
  const term = query.trim().slice(0, 200);
  if (!term || !grafoId) return [];

  const graphNodes = await prisma.nodeConhecimento.findMany({
    where: { grafoId, usuarioId: userId },
    select: { referenciaId: true, tipoNode: true },
  });

  const byType: Record<string, string[]> = {};
  for (const n of graphNodes) {
    (byType[n.tipoNode] ??= []).push(n.referenciaId);
  }

  const matched = new Set<string>();
  const add = (rows: { id: string }[]) => rows.forEach((r) => matched.add(r.id));
  const has = (t: string) => (byType[t]?.length ?? 0) > 0;
  const contains = { contains: term };

  await Promise.all([
    has("NOTA") &&
      prisma.nota
        .findMany({ where: { id: { in: byType.NOTA }, conteudo: contains }, select: { id: true } })
        .then(add),
    has("FLASHCARD") &&
      prisma.flashcard
        .findMany({
          where: {
            id: { in: byType.FLASHCARD },
            OR: [{ pergunta: contains }, { resposta: contains }],
          },
          select: { id: true },
        })
        .then(add),
    has("TEXTO_BRUTO") &&
      prisma.textoBruto
        .findMany({ where: { id: { in: byType.TEXTO_BRUTO }, texto: contains }, select: { id: true } })
        .then(add),
    has("CONCEITO") &&
      prisma.conceito
        .findMany({ where: { id: { in: byType.CONCEITO }, descricao: contains }, select: { id: true } })
        .then(add),
    has("ASSUNTO") &&
      prisma.assunto
        .findMany({ where: { id: { in: byType.ASSUNTO }, descricao: contains }, select: { id: true } })
        .then(add),
    has("TOPICO") &&
      prisma.topico
        .findMany({ where: { id: { in: byType.TOPICO }, descricao: contains }, select: { id: true } })
        .then(add),
  ]);

  return [...matched];
}

export async function getGrafoInfo(grafoId: string): Promise<{ nome: string; descricao?: string } | null> {
  const userId = await requireUserId();
  const grafo = await prisma.grafosConhecimento.findFirst({
    where: { id: grafoId, usuarioId: userId },
    select: { nome: true, descricao: true },
  });
  return grafo || null;
}

export async function updateGrafoNome(grafoId: string, nome: string): Promise<void> {
  const userId = await requireUserId();
  await prisma.grafosConhecimento.update({
    where: { id: grafoId, usuarioId: userId },
    data: { nome },
  });
  revalidatePath("/graph");
  revalidatePath(`/graph/${grafoId}`);
}

export async function getCriticalNodes(grafoId?: string): Promise<GraphNode[]> {
  const userId = await requireUserId();
  const { nodes } = await buildKnowledgeGraph(userId, grafoId);
  return libGetCriticalNodes(nodes);
}

export async function clearAllGraphNodes(grafoId?: string): Promise<{ count: number; summary: Record<string, number> }> {
  const userId = await requireUserId();

  const summary: Record<string, number> = {};

  await prisma.$transaction(async (tx) => {
    if (grafoId) {
      // Clear only this specific graph
      const edgeCount = await tx.conhecimentoAresta.deleteMany({ where: { grafoId } });
      summary.arestas = edgeCount.count;

      const nodeCount = await tx.nodeConhecimento.deleteMany({ where: { grafoId } });
      summary.nodes = nodeCount.count;

      const grafoCount = await tx.grafosConhecimento.deleteMany({ where: { id: grafoId } });
      summary.grafos = grafoCount.count;
    } else {
      // Legacy: clear all graphs for user
      const nodeIds = (await tx.nodeConhecimento.findMany({
        where: { usuarioId: userId },
        select: { id: true },
      })).map((n) => n.id);

      const safeIn = (ids: string[]) => ids.length > 0 ? ids : ["__none__"];

      const r4 = await tx.conhecimentoAresta.deleteMany({
        where: { OR: [{ nodeOrigemId: { in: safeIn(nodeIds) } }, { nodeDestinoId: { in: safeIn(nodeIds) } }] },
      });
      summary.arestas = r4.count;

      const r6 = await tx.nodeConhecimento.deleteMany({ where: { usuarioId: userId } });
      summary.nodes = r6.count;

      const rGrafos = await tx.grafosConhecimento.deleteMany({ where: { usuarioId: userId } });
      summary.grafos = rGrafos.count;
    }
  });

  revalidatePath("/graph");
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  return { count: total, summary };
}

export async function removeNodeFromGraph(graphNodeId: string, grafoId: string): Promise<{ success: boolean }> {
  const userId = await requireUserId();

  // Find the nodeConhecimento record
  const node = await prisma.nodeConhecimento.findFirst({
    where: { referenciaId: graphNodeId, usuarioId: userId, grafoId },
  });

  if (!node) {
    throw new Error("Node não encontrado no grafo");
  }

  await prisma.$transaction(async (tx) => {
    // Remove all edges connected to this node
    await tx.conhecimentoAresta.deleteMany({
      where: { OR: [{ nodeOrigemId: node.id }, { nodeDestinoId: node.id }] },
    });

    // Remove performance data
    await tx.desempenhoNo.deleteMany({ where: { nodeId: node.id } });

    // Remove only the nodeConhecimento (NOT the actual entity)
    await tx.nodeConhecimento.delete({ where: { id: node.id } });
  });

  revalidatePath(`/graph/${grafoId}`);
  return { success: true };
}


export async function deleteGraphNode(graphNodeId: string, grafoId?: string): Promise<{ success: boolean; deletedType?: string }> {
  const userId = await requireUserId();

  // Aceita "tipo:referenciaId" ou só "referenciaId" — extrai o refId; o store
  // resolve o tipo. (mantém compatibilidade com chamadas antigas)
  const colonIdx = graphNodeId.indexOf(":");
  const refId = colonIdx > -1 ? graphNodeId.slice(colonIdx + 1) : graphNodeId;

  const store = await getGraphStore();
  const { deletedType } = await store.deleteNode(userId, refId, grafoId);

  revalidatePath("/graph");
  if (grafoId) revalidatePath(`/graph/${grafoId}`);
  return { success: true, deletedType };
}

// Campos editáveis da entidade referenciada por um nó do grafo
export async function getNodeDetails(
  tipoNode: string,
  referenciaId: string
): Promise<Record<string, string | null> | null> {
  const userId = await requireUserId();
  const store = await getGraphStore();
  return store.getNodeDetails(userId, tipoNode as any, referenciaId);
}

export async function updateGraphNode(
  tipoNode: string,
  referenciaId: string,
  data: { nome?: string; descricao?: string | null; pergunta?: string; resposta?: string; conteudo?: string; titulo?: string; tipoNota?: string; fonte?: string | null; subtipo?: string; texto?: string },
  grafoId?: string
): Promise<{ success: boolean }> {
  const userId = await requireUserId();
  // defense-in-depth: limita o tamanho dos campos
  assertFieldLimits(data as Record<string, unknown>);

  // validação por tipo; a persistência fica no store ativo (banco ou vault)
  switch (tipoNode) {
    case "ASSUNTO":
    case "TOPICO":
    case "CONCEITO":
    case "FLASHCARD":
      break;
    case "NOTA":
      if (data.titulo !== undefined && !data.titulo.trim()) throw new Error("O título da nota é obrigatório");
      if (data.tipoNota && !["LITERATURA", "PERMANENTE", "ESTRUTURA"].includes(data.tipoNota)) {
        throw new Error(`Tipo de nota inválido: ${data.tipoNota}`);
      }
      if (data.tipoNota === "LITERATURA" && !data.fonte?.trim()) {
        throw new Error("Notas de referência (literatura) exigem a fonte");
      }
      if (data.subtipo && !NOTA_SUBTIPOS.includes(data.subtipo as any)) {
        throw new Error(`Subtipo de nota inválido: ${data.subtipo}`);
      }
      break;
    case "TEXTO_BRUTO":
      if (data.texto !== undefined && !data.texto.trim()) throw new Error("O texto original é obrigatório");
      break;
    default:
      throw new Error(`Tipo de nó desconhecido: ${tipoNode}`);
  }

  const store = await getGraphStore();
  await store.updateNode(userId, tipoNode as any, referenciaId, data, grafoId);

  if (grafoId) revalidatePath(`/graph/${grafoId}`);
  return { success: true };
}

export async function deleteEdge(edgeId: string, grafoId: string): Promise<{ success: boolean }> {
  const userId = await requireUserId();
  const store = await getGraphStore();
  await store.deleteEdge(userId, grafoId, edgeId);
  revalidatePath(`/graph/${grafoId}`);
  return { success: true };
}


export async function createEdge(grafoId: string, data: {
  sourceNodeId: string;
  targetNodeId: string;
  tipoRelacao: TipoRelacao;
  peso?: number;
}): Promise<{ success: boolean; edgeId: string }> {
  const userId = await requireUserId();
  const store = await getGraphStore();
  const { edgeId } = await store.createEdge(userId, grafoId, data);
  revalidatePath(`/graph/${grafoId}`);
  return { success: true, edgeId };
}

export async function updateEdge(edgeId: string, grafoId: string, data: {
  tipoRelacao?: TipoRelacao;
  peso?: number;
}): Promise<{ success: boolean }> {
  const userId = await requireUserId();
  const store = await getGraphStore();
  await store.updateEdge(userId, grafoId, edgeId, data);
  revalidatePath(`/graph/${grafoId}`);
  return { success: true };
}

export async function getGraphEdges(grafoId: string): Promise<Array<{
  id: string;
  source: string;
  target: string;
  tipoRelacao: TipoRelacao;
  peso: number;
  sourceLabel: string;
  targetLabel: string;
}>> {
  const userId = await requireUserId();
  const store = await getGraphStore();
  return store.getEdges(userId, grafoId);
}

// --- Helper data for creating nodes ---

export interface ParentOptions {
  assuntos: { id: string; nome: string }[];
  topicos: { id: string; nome: string }[];
  conceitos: { id: string; nome: string }[];
}

const NOTA_SUBTIPOS = [
  "DEFINICAO", "EXPLICACAO", "EXEMPLO", "COMPARACAO",
  "SINTESE", "PREREQUISITO", "ERRO_COMUM", "APLICACAO",
] as const;

// Limites de tamanho por campo — validados no servidor (defense-in-depth),
// pois a API pode ser chamada diretamente, ignorando a validação do cliente.
const FIELD_MAX_LEN: Record<string, number> = {
  titulo: 500, conteudo: 50_000, texto: 200_000, nome: 500,
  descricao: 5_000, pergunta: 10_000, resposta: 10_000, fonte: 1_000,
};

// Lança erro se um campo string ultrapassar o limite definido.
function assertFieldLimits(data: Record<string, unknown>) {
  for (const [field, max] of Object.entries(FIELD_MAX_LEN)) {
    const v = data[field];
    if (typeof v === "string" && v.length > max) {
      throw new Error(`O campo "${field}" excede o limite de ${max} caracteres`);
    }
  }
}

// slug único estilo Zettelkasten: timestamp de criação + título normalizado
function buildNotaSlug(titulo: string, when: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${when.getFullYear()}${pad(when.getMonth() + 1)}${pad(when.getDate())}` +
    `${pad(when.getHours())}${pad(when.getMinutes())}${pad(when.getSeconds())}`;
  const slugTitulo = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slugTitulo ? `${stamp}-${slugTitulo}` : stamp;
}

export async function addNodeToGraph(
  grafoId: string,
  tipoNode: string,
  data: any
): Promise<{ success: boolean; nodeId: string }> {
  const userId = await requireUserId();

  // Verify the grafo belongs to the user
  const grafo = await prisma.grafosConhecimento.findFirst({
    where: { id: grafoId, usuarioId: userId },
  });

  if (!grafo) {
    throw new Error("Grafo não encontrado ou não pertence ao usuário");
  }

  // defense-in-depth: limita o tamanho dos campos vindos do cliente/API
  assertFieldLimits(data);

  // Entidade já existente (ex.: adicionar flashcard/nota existente) — só cria o
  // vínculo no grafo. Caminho de banco (entidades existentes vivem no banco).
  if (data.entityId) {
    if (await isMarkdownMode()) throw new Error(MARKDOWN_NOT_SUPPORTED);
    await prisma.nodeConhecimento.create({
      data: {
        grafoId,
        tipoNode: tipoNode as any,
        referenciaId: data.entityId,
        usuarioId: userId,
        posicaoX: data.posicaoX ?? null,
        posicaoY: data.posicaoY ?? null,
        nivelDominio: data.nivelDominio ?? 0,
      },
    });
    revalidatePath(`/graph/${grafoId}`);
    return { success: true, nodeId: data.entityId };
  }

  // Nova entidade: valida por tipo, depois persiste pelo store ativo
  // (banco ou vault Markdown). A criação da entidade + nó fica no store.
  switch (tipoNode) {
    case "NOTA": {
      if (!data.titulo?.trim()) throw new Error("O título da nota é obrigatório");
      const tiposNota = ["LITERATURA", "PERMANENTE", "ESTRUTURA"];
      const tipoNota = data.tipoNota ?? "PERMANENTE";
      if (!tiposNota.includes(tipoNota)) throw new Error(`Tipo de nota inválido: ${tipoNota}`);
      if (tipoNota === "LITERATURA" && !data.fonte?.trim()) {
        throw new Error("Notas de referência (literatura) exigem a fonte");
      }
      if (!data.subtipo || !NOTA_SUBTIPOS.includes(data.subtipo)) {
        throw new Error("Selecione o subtipo da nota");
      }
      break;
    }
    case "TEXTO_BRUTO":
      if (!data.texto?.trim()) throw new Error("O texto original é obrigatório");
      break;
    case "FLASHCARD":
    case "ASSUNTO":
    case "TOPICO":
    case "CONCEITO":
    case "BARALHO":
      break;
    default:
      throw new Error(`Tipo de nó desconhecido: ${tipoNode}`);
  }

  const store = await getGraphStore();
  const { nodeId } = await store.createNode(userId, grafoId, tipoNode as any, {
    posicaoX: data.posicaoX ?? null,
    posicaoY: data.posicaoY ?? null,
    nivelDominio: data.nivelDominio ?? 0,
    nome: data.nome,
    descricao: data.descricao ?? null,
    pergunta: data.pergunta,
    resposta: data.resposta,
    titulo: data.titulo?.trim(),
    conteudo: data.conteudo,
    tipoNota: data.tipoNota ?? "PERMANENTE",
    subtipo: data.subtipo,
    fonte: data.fonte ?? null,
    texto: data.texto?.trim(),
    assuntoId: data.assuntoId ?? null,
    topicoId: data.topicoId ?? null,
  });

  revalidatePath(`/graph/${grafoId}`);
  return { success: true, nodeId };
}

// ---------------------------------------------------------------------------
// Baralho (deck): cria a entidade, o nó no grafo e as arestas CONTEM para os
// flashcards selecionados (adicionando-os como nós se necessário) — atômico.
// O deck pode ser criado vazio.
// ---------------------------------------------------------------------------
export async function createBaralhoNode(
  grafoId: string,
  titulo: string,
  flashcardIds: string[]
): Promise<{ success: boolean; nodeId: string }> {
  const userId = await requireUserId();
  if (await isMarkdownMode()) throw new Error(MARKDOWN_NOT_SUPPORTED);

  const grafo = await prisma.grafosConhecimento.findFirst({ where: { id: grafoId, usuarioId: userId } });
  if (!grafo) throw new Error("Grafo não encontrado ou não pertence ao usuário");

  const tituloTrim = titulo?.trim();
  if (!tituloTrim) throw new Error("O título do baralho é obrigatório");
  assertFieldLimits({ titulo: tituloTrim });

  const ids = Array.from(new Set(flashcardIds ?? []));
  if (ids.length > 1000) throw new Error("Máximo de 1000 flashcards por baralho");

  // garante que todos os flashcards pertencem ao usuário
  if (ids.length > 0) {
    const count = await prisma.flashcard.count({ where: { id: { in: ids }, usuarioId: userId } });
    if (count !== ids.length) throw new Error("Um ou mais flashcards não pertencem ao usuário");
  }

  const now = new Date();

  const baralhoId = await prisma.$transaction(async (tx) => {
    // entidade Baralho com os flashcards conectados (fonte de verdade da composição)
    const baralho = await tx.baralho.create({
      data: {
        titulo: tituloTrim,
        usuarioId: userId,
        dataCriacao: now,
        flashcards: ids.length > 0 ? { connect: ids.map((id) => ({ id })) } : undefined,
      },
    });

    // nó do baralho no grafo
    const baralhoNode = await tx.nodeConhecimento.create({
      data: { grafoId, tipoNode: "BARALHO", referenciaId: baralho.id, usuarioId: userId },
    });

    // garante o nó de cada flashcard no grafo e cria a aresta CONTEM
    for (const fcId of ids) {
      let fcNode = await tx.nodeConhecimento.findFirst({
        where: { grafoId, usuarioId: userId, tipoNode: "FLASHCARD", referenciaId: fcId },
        select: { id: true },
      });
      if (!fcNode) {
        fcNode = await tx.nodeConhecimento.create({
          data: { grafoId, tipoNode: "FLASHCARD", referenciaId: fcId, usuarioId: userId },
          select: { id: true },
        });
      }
      await tx.conhecimentoAresta.create({
        data: { grafoId, nodeOrigemId: baralhoNode.id, nodeDestinoId: fcNode.id, tipoRelacao: "CONTEM", peso: 1.0 },
      });
    }

    return baralho.id;
  });

  revalidatePath(`/graph/${grafoId}`);
  return { success: true, nodeId: baralhoId };
}

// Carrega um baralho para estudo: título + todos os seus flashcards.
export async function getDeckForStudy(baralhoId: string): Promise<{
  titulo: string;
  cards: { id: string; pergunta: string; resposta: string; conceito: string | null }[];
} | null> {
  const userId = await requireUserId();
  const baralho = await prisma.baralho.findFirst({
    where: { id: baralhoId, usuarioId: userId },
    include: {
      flashcards: {
        include: { conceito: { select: { nome: true } } },
        orderBy: { dataCriacao: "asc" },
      },
    },
  });
  if (!baralho) return null;
  return {
    titulo: baralho.titulo,
    cards: baralho.flashcards.map((fc) => ({
      id: fc.id,
      pergunta: fc.pergunta,
      resposta: fc.resposta,
      conceito: fc.conceito?.nome ?? null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Importação genérica do grafo: quaisquer tipos de nó + arestas, num único JSON.
// Cada nó tem um "ref" (id local) referenciado pelas arestas. Tudo numa
// transação atômica, com as mesmas regras de relação da legenda.
// ---------------------------------------------------------------------------

export interface ImportGraphNode {
  ref: string;
  tipo: string;
  // campos variam por tipo
  nome?: string;
  descricao?: string | null;
  pergunta?: string;
  resposta?: string;
  titulo?: string;
  conteudo?: string;
  tipoNota?: string;
  subtipo?: string;
  fonte?: string | null;
  texto?: string;
}
export interface ImportGraphEdge {
  origem: string;
  destino: string;
  relacao: string;
  peso?: number;
}
export interface ImportGraphPayload {
  nodes: ImportGraphNode[];
  edges: ImportGraphEdge[];
}

const IMPORT_NODE_TIPOS = ["ASSUNTO", "TOPICO", "CONCEITO", "FLASHCARD", "NOTA", "TEXTO_BRUTO", "BARALHO"];
const IMPORT_GRAPH_MAX = { nodes: 2000, edges: 5000 };

export async function importGraph(
  grafoId: string,
  payload: ImportGraphPayload
): Promise<{ nodes: number; edges: number; reused: number }> {
  const userId = await requireUserId();
  if (await isMarkdownMode()) throw new Error(MARKDOWN_NOT_SUPPORTED);

  const grafo = await prisma.grafosConhecimento.findFirst({ where: { id: grafoId, usuarioId: userId } });
  if (!grafo) throw new Error("Grafo não encontrado ou não pertence ao usuário");

  const nodes = payload?.nodes ?? [];
  const edges = payload?.edges ?? [];
  if (nodes.length === 0) throw new Error("Forneça ao menos um nó.");
  if (nodes.length > IMPORT_GRAPH_MAX.nodes) throw new Error(`Máximo de ${IMPORT_GRAPH_MAX.nodes} nós por importação.`);
  if (edges.length > IMPORT_GRAPH_MAX.edges) throw new Error(`Máximo de ${IMPORT_GRAPH_MAX.edges} arestas por importação.`);

  // valida nós e refs (fora da transação, para falhar cedo)
  const refSet = new Set<string>();
  const refTipo = new Map<string, string>();
  for (const [i, n] of nodes.entries()) {
    const pos = ` (nó #${i + 1})`;
    const ref = typeof n.ref === "string" ? n.ref.trim() : "";
    if (!ref) throw new Error(`Cada nó precisa de um "ref"${pos}.`);
    if (refSet.has(ref)) throw new Error(`"ref" duplicado: "${ref}"${pos}.`);
    if (!IMPORT_NODE_TIPOS.includes(n.tipo)) throw new Error(`"tipo" inválido (${n.tipo})${pos}. Use: ${IMPORT_NODE_TIPOS.join(", ")}.`);
    refSet.add(ref);
    refTipo.set(ref, n.tipo);
    assertFieldLimits(n as unknown as Record<string, unknown>);
    validateImportNodeFields(n, pos);
  }

  // valida arestas contra as regras de relação
  for (const [i, e] of edges.entries()) {
    const pos = ` (aresta #${i + 1})`;
    const to = refTipo.get(e.origem);
    const td = refTipo.get(e.destino);
    if (!to) throw new Error(`"origem" desconhecida ("${e.origem}")${pos}.`);
    if (!td) throw new Error(`"destino" desconhecido ("${e.destino}")${pos}.`);
    if (e.origem === e.destino) throw new Error(`Aresta não pode ligar um nó a si mesmo${pos}.`);
    if (e.peso !== undefined && (typeof e.peso !== "number" || !Number.isFinite(e.peso) || e.peso <= 0 || e.peso > 2)) {
      throw new Error(`"peso" deve ser um número entre 0 e 2${pos}.`);
    }
    if (!isRelationAllowed(to, td, e.relacao)) {
      const allowed = getAllowedRelations(to, td);
      throw new Error(
        `Relação "${e.relacao}" não permitida entre ${to} e ${td}${pos}. ${allowed.length ? `Permitidas: ${allowed.join(", ")}.` : "Esses tipos não podem se relacionar."}`
      );
    }
  }

  const now = new Date();

  const result = await prisma.$transaction(
    async (tx) => {
      // ref -> { referenciaId, nodeId }
      const created = new Map<string, { refId: string; nodeId: string }>();

      const createEntity = async (n: ImportGraphNode): Promise<string> => {
        switch (n.tipo) {
          case "ASSUNTO":
            return (await tx.assunto.create({ data: { nome: n.nome!.trim(), descricao: n.descricao ?? null, usuarioId: userId } })).id;
          case "TOPICO":
            return (await tx.topico.create({ data: { nome: n.nome!.trim(), descricao: n.descricao ?? null, usuarioId: userId } })).id;
          case "CONCEITO":
            return (await tx.conceito.create({ data: { nome: n.nome!.trim(), descricao: n.descricao ?? null, usuarioId: userId } })).id;
          case "FLASHCARD":
            return (await tx.flashcard.create({ data: { pergunta: n.pergunta!.trim(), resposta: n.resposta!.trim(), usuarioId: userId, dataCriacao: now } })).id;
          case "NOTA": {
            const titulo = n.titulo?.trim() || deriveNotaTitulo(n.conteudo ?? "");
            return (await tx.nota.create({ data: { titulo, conteudo: n.conteudo!, tipoNota: n.tipoNota || "PERMANENTE", subtipo: n.subtipo!, fonte: n.fonte?.trim() || null, slug: buildNotaSlug(titulo, now), usuarioId: userId, dataCriacao: now } })).id;
          }
          case "TEXTO_BRUTO":
            return (await tx.textoBruto.create({ data: { titulo: n.titulo?.trim() || "Texto sem título", texto: n.texto!, usuarioId: userId, dataCriacao: now } })).id;
          case "BARALHO":
            return (await tx.baralho.create({ data: { titulo: (n.titulo ?? n.nome ?? "").trim(), usuarioId: userId, dataCriacao: now } })).id;
          default:
            throw new Error(`Tipo de nó desconhecido: ${n.tipo}`);
        }
      };

      // Nós já presentes no grafo, indexados por "tipo::nome", para reuso: um nó
      // que já existe não é recriado — as arestas apenas apontam para ele.
      const existing = await tx.nodeConhecimento.findMany({
        where: { grafoId, usuarioId: userId },
        select: { id: true, tipoNode: true, referenciaId: true },
      });
      const refsByTipo = new Map<string, string[]>();
      for (const e of existing) {
        if (!refsByTipo.has(e.tipoNode)) refsByTipo.set(e.tipoNode, []);
        refsByTipo.get(e.tipoNode)!.push(e.referenciaId);
      }
      const nameByRef = new Map<string, string>();
      for (const [tipo, ids] of refsByTipo) {
        if (ids.length === 0) continue;
        let rows: Array<{ id: string; name: string | null }> = [];
        switch (tipo) {
          case "ASSUNTO":
            rows = (await tx.assunto.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } })).map((r) => ({ id: r.id, name: r.nome }));
            break;
          case "TOPICO":
            rows = (await tx.topico.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } })).map((r) => ({ id: r.id, name: r.nome }));
            break;
          case "CONCEITO":
            rows = (await tx.conceito.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } })).map((r) => ({ id: r.id, name: r.nome }));
            break;
          case "FLASHCARD":
            rows = (await tx.flashcard.findMany({ where: { id: { in: ids } }, select: { id: true, pergunta: true } })).map((r) => ({ id: r.id, name: r.pergunta }));
            break;
          case "NOTA":
            rows = (await tx.nota.findMany({ where: { id: { in: ids } }, select: { id: true, titulo: true } })).map((r) => ({ id: r.id, name: r.titulo }));
            break;
          case "TEXTO_BRUTO":
            rows = (await tx.textoBruto.findMany({ where: { id: { in: ids } }, select: { id: true, titulo: true } })).map((r) => ({ id: r.id, name: r.titulo }));
            break;
          case "BARALHO":
            rows = (await tx.baralho.findMany({ where: { id: { in: ids } }, select: { id: true, titulo: true } })).map((r) => ({ id: r.id, name: r.titulo }));
            break;
        }
        for (const r of rows) nameByRef.set(r.id, normImportName(r.name ?? ""));
      }
      const byName = new Map<string, { refId: string; nodeId: string }>();
      for (const e of existing) {
        const nm = nameByRef.get(e.referenciaId);
        if (nm) byName.set(`${e.tipoNode}::${nm}`, { refId: e.referenciaId, nodeId: e.id });
      }

      let createdNodeCount = 0;
      let reusedNodeCount = 0;
      for (const n of nodes) {
        const key = `${n.tipo}::${normImportName(importNodeDisplayName(n))}`;
        const reuse = byName.get(key);
        if (reuse) {
          // já existe no grafo: não recria, apenas aponta para o nó existente
          created.set(n.ref.trim(), reuse);
          reusedNodeCount++;
          continue;
        }
        const refId = await createEntity(n);
        const node = await tx.nodeConhecimento.create({
          data: { grafoId, tipoNode: n.tipo as any, referenciaId: refId, usuarioId: userId },
        });
        const entry = { refId, nodeId: node.id };
        created.set(n.ref.trim(), entry);
        // nomes únicos: refs seguintes com o mesmo tipo+nome reusam este nó
        byName.set(key, entry);
        createdNodeCount++;
      }

      // arestas já existentes no grafo entram no "visto" para não duplicar
      const existingEdges = await tx.conhecimentoAresta.findMany({
        where: { grafoId },
        select: { nodeOrigemId: true, nodeDestinoId: true, tipoRelacao: true },
      });
      const edgeSeen = new Set<string>(
        existingEdges.map((e) => `${e.nodeOrigemId}->${e.nodeDestinoId}->${e.tipoRelacao}`)
      );
      let edgeCount = 0;
      for (const e of edges) {
        const s = created.get(e.origem);
        const t = created.get(e.destino);
        if (!s || !t) continue;
        const key = `${s.nodeId}->${t.nodeId}->${e.relacao}`;
        if (edgeSeen.has(key)) continue;
        await tx.conhecimentoAresta.create({
          data: { grafoId, nodeOrigemId: s.nodeId, nodeDestinoId: t.nodeId, tipoRelacao: e.relacao as any, peso: e.peso ?? 1.0 },
        });
        edgeSeen.add(key);
        edgeCount++;
        // BARALHO contém FLASHCARD: mantém também a composição m-n do deck
        if (refTipo.get(e.origem) === "BARALHO" && refTipo.get(e.destino) === "FLASHCARD" && e.relacao === "CONTEM") {
          await tx.baralho.update({ where: { id: s.refId }, data: { flashcards: { connect: { id: t.refId } } } });
        }
      }

      return { nodes: createdNodeCount, edges: edgeCount, reused: reusedNodeCount };
    },
    { maxWait: 10_000, timeout: 120_000 }
  );

  revalidatePath(`/graph/${grafoId}`);
  return result;
}

// Valida os campos obrigatórios de um nó conforme o tipo.
function validateImportNodeFields(n: ImportGraphNode, pos: string) {
  const need = (cond: boolean, msg: string) => { if (!cond) throw new Error(`${msg}${pos}.`); };
  switch (n.tipo) {
    case "ASSUNTO":
    case "TOPICO":
    case "CONCEITO":
      need(!!n.nome?.trim(), '"nome" é obrigatório');
      break;
    case "FLASHCARD":
      need(!!n.pergunta?.trim(), '"pergunta" é obrigatória');
      need(!!n.resposta?.trim(), '"resposta" é obrigatória');
      break;
    case "NOTA":
      need(!!n.conteudo?.trim(), '"conteudo" é obrigatório');
      need(["LITERATURA", "PERMANENTE", "ESTRUTURA"].includes(n.tipoNota || "PERMANENTE"), '"tipoNota" inválido');
      need(NOTA_SUBTIPOS.includes((n.subtipo ?? "") as any), '"subtipo" inválido');
      if ((n.tipoNota || "PERMANENTE") === "LITERATURA") need(!!n.fonte?.trim(), 'Notas LITERATURA exigem "fonte"');
      break;
    case "TEXTO_BRUTO":
      need(!!n.texto?.trim(), '"texto" é obrigatório');
      break;
    case "BARALHO":
      need(!!(n.titulo?.trim() || n.nome?.trim()), '"titulo" é obrigatório');
      break;
  }
}

// deriva um título de nota a partir do conteúdo (primeira linha, sem Markdown)
function deriveNotaTitulo(conteudo: string): string {
  const line = conteudo.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "";
  const clean = line.replace(/^#{1,6}\s*/, "").replace(/[*_`]/g, "").trim();
  return clean ? clean.slice(0, 120) : "Sem título";
}

// Nome de exibição de um nó de importação — é por ele (tipo + nome) que se
// identifica se a entidade já existe no grafo. Os nomes são tratados como únicos.
function importNodeDisplayName(n: ImportGraphNode): string {
  switch (n.tipo) {
    case "ASSUNTO":
    case "TOPICO":
    case "CONCEITO":
      return (n.nome ?? "").trim();
    case "FLASHCARD":
      return (n.pergunta ?? "").trim();
    case "NOTA":
      return (n.titulo?.trim() || deriveNotaTitulo(n.conteudo ?? "")).trim();
    case "TEXTO_BRUTO":
      return n.titulo?.trim() || "Texto sem título";
    case "BARALHO":
      return (n.titulo ?? n.nome ?? "").trim();
    default:
      return "";
  }
}

// normaliza um nome para comparação (case-insensitive, sem espaços nas pontas)
const normImportName = (s: string) => s.trim().toLowerCase();

// ---------------------------------------------------------------------------
// Importação em lote (texto bruto + notas + relações + flashcards)
// Tudo numa única transação atômica: ou cria tudo, ou nada (sem import parcial).
// ---------------------------------------------------------------------------

const IMPORT_NOTA_TIPOS = ["LITERATURA", "PERMANENTE", "ESTRUTURA"];
const IMPORT_RELATABLE = ["CONCEITO", "TOPICO", "ASSUNTO"];
const IMPORT_MAX = { notas: 500, relacoes: 100, flashcards: 100 };

export interface ImportAssuntoRef { nome: string; descricao: string | null }
export interface ImportTopicoRef { nome: string; descricao: string | null; assunto: ImportAssuntoRef }
export interface ImportRelacao {
  relacao: string;
  peso: number;
  alvo: {
    tipoNode: "CONCEITO" | "TOPICO" | "ASSUNTO";
    nome: string;
    descricao: string | null;
    topico?: ImportTopicoRef;
    assunto?: ImportAssuntoRef;
  };
}
export interface ImportNota {
  titulo: string;
  conteudo: string;
  tipoNota: string;
  subtipo: string;
  fonte: string | null;
  relacoes: ImportRelacao[];
  flashcards: { pergunta: string; resposta: string }[];
}
export interface ImportNotasPayload {
  textoOriginal: { titulo: string; texto: string } | null;
  notas: ImportNota[];
}

export async function importGraphNotas(
  grafoId: string,
  payload: ImportNotasPayload
): Promise<{ textoBruto: boolean; notas: number; flashcards: number; edges: number }> {
  const userId = await requireUserId();
  if (await isMarkdownMode()) throw new Error(MARKDOWN_NOT_SUPPORTED);

  const grafo = await prisma.grafosConhecimento.findFirst({ where: { id: grafoId, usuarioId: userId } });
  if (!grafo) throw new Error("Grafo não encontrado ou não pertence ao usuário");

  const notas = payload?.notas ?? [];
  if (notas.length === 0) throw new Error("Forneça ao menos uma nota.");
  if (notas.length > IMPORT_MAX.notas) throw new Error(`Máximo de ${IMPORT_MAX.notas} notas por importação.`);

  const now = new Date();

  const result = await prisma.$transaction(
    async (tx) => {
      // referenciaId -> { nodeConhecimento.id, tipoNode } para resolver arestas sem novas queries
      const refToNode = new Map<string, { id: string; tipoNode: string }>();
      const nodeCache = new Map<string, string>(); // tipoNode::nome (lower) -> referenciaId
      const edgeSeen = new Set<string>();
      let edges = 0;
      let flashcardsCount = 0;

      const linkNode = async (tipoNode: string, referenciaId: string) => {
        const node = await tx.nodeConhecimento.create({
          data: { grafoId, tipoNode: tipoNode as any, referenciaId, usuarioId: userId },
        });
        refToNode.set(referenciaId, { id: node.id, tipoNode });
      };

      const ensureNode = async (
        tipoNode: "CONCEITO" | "TOPICO" | "ASSUNTO",
        nomeRaw: string,
        descricao: string | null
      ): Promise<string> => {
        const nome = nomeRaw.trim();
        if (!nome) throw new Error("Nome do nó é obrigatório");
        assertFieldLimits({ nome, descricao: descricao ?? undefined });
        const key = `${tipoNode}::${nome.toLowerCase()}`;
        const cached = nodeCache.get(key);
        if (cached) return cached;
        let id: string;
        if (tipoNode === "ASSUNTO") id = (await tx.assunto.create({ data: { nome, descricao, usuarioId: userId } })).id;
        else if (tipoNode === "TOPICO") id = (await tx.topico.create({ data: { nome, descricao, usuarioId: userId } })).id;
        else id = (await tx.conceito.create({ data: { nome, descricao, usuarioId: userId } })).id;
        await linkNode(tipoNode, id);
        nodeCache.set(key, id);
        return id;
      };

      const ensureEdge = async (srcRef: string, tgtRef: string, rel: string, peso = 1.0) => {
        const k = `${srcRef}->${tgtRef}->${rel}`;
        if (edgeSeen.has(k)) return;
        const s = refToNode.get(srcRef);
        const t = refToNode.get(tgtRef);
        if (!s || !t) throw new Error("Nó não encontrado no grafo durante a importação");
        if (!isRelationAllowed(s.tipoNode, t.tipoNode, rel)) {
          const allowed = getAllowedRelations(s.tipoNode, t.tipoNode);
          throw new Error(
            `Relação ${rel} não é permitida entre ${s.tipoNode} e ${t.tipoNode}. Permitidas: ${allowed.join(", ")}`
          );
        }
        await tx.conhecimentoAresta.create({
          data: { grafoId, nodeOrigemId: s.id, nodeDestinoId: t.id, tipoRelacao: rel as any, peso },
        });
        edgeSeen.add(k);
        edges++;
      };

      // texto original (fonte)
      let textoBrutoRef: string | null = null;
      if (payload.textoOriginal) {
        const titulo = payload.textoOriginal.titulo?.trim() || "Texto sem título";
        const texto = payload.textoOriginal.texto ?? "";
        assertFieldLimits({ titulo, texto });
        if (!texto.trim()) throw new Error("O texto original é obrigatório");
        const tb = await tx.textoBruto.create({ data: { titulo, texto, usuarioId: userId, dataCriacao: now } });
        textoBrutoRef = tb.id;
        await linkNode("TEXTO_BRUTO", tb.id);
      }

      for (const [i, nota] of notas.entries()) {
        const pos = ` (nota #${i + 1})`;
        const titulo = nota.titulo?.trim();
        if (!titulo) throw new Error(`O título da nota é obrigatório${pos}`);
        const conteudo = nota.conteudo ?? "";
        if (!conteudo.trim()) throw new Error(`O conteúdo da nota é obrigatório${pos}`);
        const tipoNota = nota.tipoNota || "PERMANENTE";
        if (!IMPORT_NOTA_TIPOS.includes(tipoNota)) throw new Error(`tipoNota inválido${pos}`);
        if (!NOTA_SUBTIPOS.includes(nota.subtipo as any)) throw new Error(`subtipo inválido${pos}`);
        const fonte = nota.fonte?.trim() || null;
        if (tipoNota === "LITERATURA" && !fonte) throw new Error(`Notas de referência exigem fonte${pos}`);
        assertFieldLimits({ titulo, conteudo, fonte: fonte ?? undefined });

        const created = await tx.nota.create({
          data: { titulo, conteudo, tipoNota, subtipo: nota.subtipo, fonte, slug: buildNotaSlug(titulo, now), usuarioId: userId, dataCriacao: now },
        });
        await linkNode("NOTA", created.id);
        if (textoBrutoRef) await ensureEdge(textoBrutoRef, created.id, "GERA");

        const relacoes = nota.relacoes ?? [];
        if (relacoes.length > IMPORT_MAX.relacoes) throw new Error(`Máximo de ${IMPORT_MAX.relacoes} relações por nota${pos}`);

        const conceitoRefs: string[] = [];
        for (const rel of relacoes) {
          const a = rel.alvo;
          if (!a || !IMPORT_RELATABLE.includes(a.tipoNode)) throw new Error(`alvo.tipoNode inválido${pos}`);
          if (typeof rel.peso !== "number" || !Number.isFinite(rel.peso) || rel.peso <= 0 || rel.peso > 2) {
            throw new Error(`peso inválido (0–2)${pos}`);
          }
          if (!isRelationAllowed("NOTA", a.tipoNode, rel.relacao)) {
            throw new Error(`Relação ${rel.relacao} não permitida entre NOTA e ${a.tipoNode}${pos}`);
          }

          let alvoRef: string;
          if (a.tipoNode === "ASSUNTO") {
            alvoRef = await ensureNode("ASSUNTO", a.nome, a.descricao);
          } else if (a.tipoNode === "TOPICO") {
            if (!a.assunto?.nome?.trim()) throw new Error(`tópico exige assunto${pos}`);
            const assuntoRef = await ensureNode("ASSUNTO", a.assunto.nome, a.assunto.descricao);
            alvoRef = await ensureNode("TOPICO", a.nome, a.descricao);
            await ensureEdge(alvoRef, assuntoRef, "PERTENCE_A");
          } else {
            const t = a.topico;
            if (!t?.nome?.trim() || !t.assunto?.nome?.trim()) throw new Error(`conceito exige tópico e assunto${pos}`);
            const assuntoRef = await ensureNode("ASSUNTO", t.assunto.nome, t.assunto.descricao);
            const topicoRef = await ensureNode("TOPICO", t.nome, t.descricao);
            await ensureEdge(topicoRef, assuntoRef, "PERTENCE_A");
            alvoRef = await ensureNode("CONCEITO", a.nome, a.descricao);
            await ensureEdge(alvoRef, topicoRef, "PERTENCE_A");
            conceitoRefs.push(alvoRef);
          }
          await ensureEdge(created.id, alvoRef, rel.relacao, rel.peso);
        }

        const flashcards = nota.flashcards ?? [];
        if (flashcards.length > IMPORT_MAX.flashcards) throw new Error(`Máximo de ${IMPORT_MAX.flashcards} flashcards por nota${pos}`);
        for (const fc of flashcards) {
          const pergunta = fc.pergunta?.trim();
          const resposta = fc.resposta?.trim();
          if (!pergunta || !resposta) throw new Error(`flashcard exige pergunta e resposta${pos}`);
          assertFieldLimits({ pergunta, resposta });
          const f = await tx.flashcard.create({ data: { pergunta, resposta, usuarioId: userId, dataCriacao: now } });
          await linkNode("FLASHCARD", f.id);
          await ensureEdge(f.id, created.id, "TESTA");
          for (const cRef of conceitoRefs) await ensureEdge(f.id, cRef, "HERDA");
          flashcardsCount++;
        }
      }

      return { textoBruto: textoBrutoRef != null, notas: notas.length, flashcards: flashcardsCount, edges };
    },
    { maxWait: 10_000, timeout: 120_000 }
  );

  revalidatePath(`/graph/${grafoId}`);
  return result;
}


export async function getParentOptions(userId?: string): Promise<ParentOptions> {
  const uid = userId ?? (await requireUserId());

  const [assuntos, topicos, conceitos] = await Promise.all([
    prisma.assunto.findMany({
      where: { usuarioId: uid },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.topico.findMany({
      where: { assunto: { usuarioId: uid } },
      include: { assunto: { select: { nome: true } } },
    }),
    prisma.conceito.findMany({
      where: { topico: { assunto: { usuarioId: uid } } },
      include: { topico: { select: { nome: true, assunto: { select: { nome: true } } } } },
    }),
  ]);

  return {
    assuntos,
    topicos: topicos.map((t) => ({ id: t.id, nome: t.assunto ? `${t.assunto.nome} → ${t.nome}` : t.nome })),
    conceitos: conceitos.map((c) => ({
      id: c.id,
      nome: c.topico
        ? c.topico.assunto
          ? `${c.topico.assunto.nome} → ${c.topico.nome} → ${c.nome}`
          : `${c.topico.nome} → ${c.nome}`
        : c.nome,
    })),
  };
}
