"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildKnowledgeGraph, getCriticalNodes as libGetCriticalNodes, type GraphNode, type GraphEdge, type TipoRelacao } from "@/lib/graph";
import { getAllowedRelations, isRelationAllowed } from "@/modules/graph/domain/services/relation-rules";

export interface GraphNodeType {
  id: string;
  label: string;
  type: "ASSUNTO" | "TOPICO" | "CONCEITO" | "FLASHCARD" | "NOTA" | "TEXTO_BRUTO";
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

  await prisma.$transaction(async (tx) => {
    for (const [refId, pos] of Object.entries(positions)) {
      const nodeId = refId.includes(":") ? refId.split(":").slice(1).join(":") : refId;
      const typePrefix = refId.includes(":") ? refId.split(":")[0].toLowerCase() : null;
      if (!typePrefix) continue;

      const typeMap: Record<string, string> = {
        flashcard: "FLASHCARD", nota: "NOTA", assunto: "ASSUNTO", topico: "TOPICO", conceito: "CONCEITO",
      };
      const tipoNode = typeMap[typePrefix];
      if (!tipoNode) continue;

      const existing = await tx.nodeConhecimento.findFirst({
        where: { grafoId, usuarioId: userId, tipoNode: tipoNode as any, referenciaId: nodeId },
        select: { id: true },
      });

      if (existing) {
        await tx.nodeConhecimento.update({ where: { id: existing.id }, data: { posicaoX: pos.x, posicaoY: pos.y } });
      } else {
        await tx.nodeConhecimento.create({
          data: { usuarioId: userId, grafoId, tipoNode: tipoNode as any, referenciaId: nodeId, posicaoX: pos.x, posicaoY: pos.y },
        });
      }
    }
  });
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
  const result = await buildKnowledgeGraph(userId, grafoId);

  // If grafoId is provided, load saved positions
  const savedPositions: Record<string, { x: number; y: number }> = {};
  if (grafoId) {
    const nodesWithPositions = await prisma.nodeConhecimento.findMany({
      where: { grafoId },
      select: { referenciaId: true, posicaoX: true, posicaoY: true },
    });
    for (const n of nodesWithPositions) {
      savedPositions[n.referenciaId] = { x: n.posicaoX ?? 0, y: n.posicaoY ?? 0 };
    }
  }

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

  // Determine if graphNodeId is in format "tipo:referenciaId" or just "referenciaId"
  const colonIdx = graphNodeId.indexOf(":");
  let refId: string;
  let nodeWhere: any = { usuarioId: userId };
  if (grafoId) nodeWhere.grafoId = grafoId;

  if (colonIdx > -1) {
    // Format: "tipo:referenciaId"
    const prefix = graphNodeId.slice(0, colonIdx).toLowerCase();
    refId = graphNodeId.slice(colonIdx + 1);
    const typeMap: Record<string, string> = {
      flashcard: "FLASHCARD",
      nota: "NOTA",
      assunto: "ASSUNTO",
      topico: "TOPICO",
      conceito: "CONCEITO",
    };
    const nodeTipo = typeMap[prefix];
    if (!nodeTipo) {
      throw new Error("Tipo de node desconhecido: " + prefix);
    }
    nodeWhere.tipoNode = nodeTipo;
    nodeWhere.referenciaId = refId;
  } else {
    // Just the reference ID - find the nodeConhecimento by referenciaId
    refId = graphNodeId;
    nodeWhere.referenciaId = refId;
  }

  // Find the nodeConhecimento record
  const node = await prisma.nodeConhecimento.findFirst({
    where: nodeWhere,
  });

  if (!node) {
    throw new Error("Node não encontrado no grafo");
  }

  const nodeTipo = node.tipoNode;

  await prisma.$transaction(async (tx) => {
    // Delete connected edges
    await tx.conhecimentoAresta.deleteMany({
      where: { OR: [{ nodeOrigemId: node.id }, { nodeDestinoId: node.id }] },
    });
    // Delete node performance data
    await tx.desempenhoNo.deleteMany({ where: { nodeId: node.id } });

    // Delete the actual entity based on type
    switch (nodeTipo) {
      case "FLASHCARD": {
        await tx.revisaoFlashcard.deleteMany({ where: { flashcardId: refId } });
        await tx.aprendizadoFlashcard.deleteMany({ where: { flashcardId: refId } });
        await tx.flashcard.delete({ where: { id: refId } });
        break;
      }
      case "NOTA": {
        await tx.nota.delete({ where: { id: refId } });
        break;
      }
      case "ASSUNTO": {
        await tx.topico.updateMany({ where: { assuntoId: refId }, data: { assuntoId: null } });
        await tx.assunto.delete({ where: { id: refId } });
        break;
      }
      case "TOPICO": {
        await tx.conceito.updateMany({ where: { topicoId: refId }, data: { topicoId: null } });
        await tx.topico.delete({ where: { id: refId } });
        break;
      }
      case "CONCEITO": {
        await tx.conceito.delete({ where: { id: refId } });
        break;
      }
    }

    // Finally, delete the nodeConhecimento record
    await tx.nodeConhecimento.delete({ where: { id: node.id } });
  });

  revalidatePath("/graph");
  if (grafoId) revalidatePath(`/graph/${grafoId}`);
  return { success: true };
}

// Campos editáveis da entidade referenciada por um nó do grafo
export async function getNodeDetails(
  tipoNode: string,
  referenciaId: string
): Promise<Record<string, string | null> | null> {
  const userId = await requireUserId();

  switch (tipoNode) {
    case "ASSUNTO": {
      const a = await prisma.assunto.findFirst({ where: { id: referenciaId, usuarioId: userId } });
      return a ? { nome: a.nome, descricao: a.descricao } : null;
    }
    case "TOPICO": {
      const t = await prisma.topico.findFirst({ where: { id: referenciaId, usuarioId: userId } });
      return t ? { nome: t.nome, descricao: t.descricao } : null;
    }
    case "CONCEITO": {
      const c = await prisma.conceito.findFirst({ where: { id: referenciaId, usuarioId: userId } });
      return c ? { nome: c.nome, descricao: c.descricao } : null;
    }
    case "FLASHCARD": {
      const f = await prisma.flashcard.findFirst({ where: { id: referenciaId, usuarioId: userId } });
      return f ? { pergunta: f.pergunta, resposta: f.resposta } : null;
    }
    case "NOTA": {
      const n = await prisma.nota.findFirst({ where: { id: referenciaId, usuarioId: userId } });
      return n
        ? {
            titulo: n.titulo,
            conteudo: n.conteudo,
            tipoNota: n.tipoNota,
            subtipo: n.subtipo,
            fonte: n.fonte,
            slug: n.slug,
            dataCriacao: n.dataCriacao.toISOString(),
            dataAtualizacao: n.dataAtualizacao.toISOString(),
          }
        : null;
    }
    case "TEXTO_BRUTO": {
      const t = await prisma.textoBruto.findFirst({ where: { id: referenciaId, usuarioId: userId } });
      return t
        ? { titulo: t.titulo, texto: t.texto, dataCriacao: t.dataCriacao.toISOString() }
        : null;
    }
    default:
      return null;
  }
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
  // updateMany com usuarioId garante que só o dono altera
  const where = { id: referenciaId, usuarioId: userId };

  let count = 0;
  switch (tipoNode) {
    case "ASSUNTO":
      count = (await prisma.assunto.updateMany({ where, data: { nome: data.nome, descricao: data.descricao } })).count;
      break;
    case "TOPICO":
      count = (await prisma.topico.updateMany({ where, data: { nome: data.nome, descricao: data.descricao } })).count;
      break;
    case "CONCEITO":
      count = (await prisma.conceito.updateMany({ where, data: { nome: data.nome, descricao: data.descricao } })).count;
      break;
    case "FLASHCARD":
      count = (await prisma.flashcard.updateMany({ where, data: { pergunta: data.pergunta, resposta: data.resposta } })).count;
      break;
    case "NOTA": {
      if (data.titulo !== undefined && !data.titulo.trim()) {
        throw new Error("O título da nota é obrigatório");
      }
      if (data.tipoNota && !["LITERATURA", "PERMANENTE", "ESTRUTURA"].includes(data.tipoNota)) {
        throw new Error(`Tipo de nota inválido: ${data.tipoNota}`);
      }
      if (data.tipoNota === "LITERATURA" && !data.fonte?.trim()) {
        throw new Error("Notas de referência (literatura) exigem a fonte");
      }
      if (data.subtipo && !NOTA_SUBTIPOS.includes(data.subtipo as any)) {
        throw new Error(`Subtipo de nota inválido: ${data.subtipo}`);
      }
      count = (await prisma.nota.updateMany({
        where,
        data: {
          titulo: data.titulo?.trim(),
          conteudo: data.conteudo,
          tipoNota: data.tipoNota,
          subtipo: data.subtipo,
          fonte: data.fonte === undefined ? undefined : data.fonte?.trim() || null,
        },
      })).count;
      break;
    }
    case "TEXTO_BRUTO": {
      if (data.texto !== undefined && !data.texto.trim()) {
        throw new Error("O texto original é obrigatório");
      }
      count = (await prisma.textoBruto.updateMany({
        where,
        data: {
          titulo: data.titulo?.trim(),
          texto: data.texto?.trim(),
        },
      })).count;
      break;
    }
    default:
      throw new Error(`Tipo de nó desconhecido: ${tipoNode}`);
  }

  if (count === 0) {
    throw new Error("Nó não encontrado ou não pertence ao usuário");
  }

  if (grafoId) revalidatePath(`/graph/${grafoId}`);
  return { success: true };
}

export async function deleteEdge(edgeId: string, grafoId: string): Promise<{ success: boolean }> {
  const userId = await requireUserId();

  // Verify edge belongs to graph and user
  const edge = await prisma.conhecimentoAresta.findFirst({
    where: { id: edgeId, grafoId },
    include: { nodeOrigem: { include: { usuario: true } } },
  });

  if (!edge || edge.nodeOrigem.usuarioId !== userId) {
    throw new Error("Relação não encontrada ou não pertence ao usuário");
  }

  await prisma.conhecimentoAresta.delete({
    where: { id: edgeId },
  });

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

  // valida o peso (força da relação): número finito em 0..2
  if (data.peso !== undefined && (typeof data.peso !== "number" || !Number.isFinite(data.peso) || data.peso <= 0 || data.peso > 2)) {
    throw new Error("Peso da relação inválido (use um número entre 0 e 2)");
  }

  // Verify both nodes belong to the user and are in the same graph
  const [sourceNode, targetNode] = await Promise.all([
    prisma.nodeConhecimento.findFirst({
      where: {
        referenciaId: data.sourceNodeId,
        usuarioId: userId,
        grafoId,
      },
    }),
    prisma.nodeConhecimento.findFirst({
      where: {
        referenciaId: data.targetNodeId,
        usuarioId: userId,
        grafoId,
      },
    }),
  ]);

  if (!sourceNode || !targetNode) {
    throw new Error("Um ou ambos os nós não encontrados no grafo");
  }

  // Regra de domínio: cada par de tipos só aceita certas relações
  if (!isRelationAllowed(sourceNode.tipoNode, targetNode.tipoNode, data.tipoRelacao)) {
    const allowed = getAllowedRelations(sourceNode.tipoNode, targetNode.tipoNode);
    throw new Error(
      allowed.length === 0
        ? `Nós do tipo ${sourceNode.tipoNode} e ${targetNode.tipoNode} não podem ser relacionados`
        : `Relação ${data.tipoRelacao} não é permitida entre ${sourceNode.tipoNode} e ${targetNode.tipoNode}. Permitidas: ${allowed.join(", ")}`
    );
  }

  // Check for duplicate edge (same source, target, and type)
  const existingEdge = await prisma.conhecimentoAresta.findFirst({
    where: {
      grafoId,
      nodeOrigemId: sourceNode.id,
      nodeDestinoId: targetNode.id,
      tipoRelacao: data.tipoRelacao,
    },
  });

  if (existingEdge) {
    throw new Error("Relação já existe entre esses nós com este tipo");
  }

  const edge = await prisma.conhecimentoAresta.create({
    data: {
      grafoId,
      nodeOrigemId: sourceNode.id,
      nodeDestinoId: targetNode.id,
      tipoRelacao: data.tipoRelacao,
      peso: data.peso ?? 1.0,
    },
  });

  revalidatePath(`/graph/${grafoId}`);
  return { success: true, edgeId: edge.id };
}

export async function updateEdge(edgeId: string, grafoId: string, data: {
  tipoRelacao?: TipoRelacao;
  peso?: number;
}): Promise<{ success: boolean }> {
  const userId = await requireUserId();

  // Verify edge exists and belongs to the user's graph
  const existingEdge = await prisma.conhecimentoAresta.findFirst({
    where: { id: edgeId, grafoId },
    include: { nodeOrigem: { include: { usuario: true } } },
  });

  if (!existingEdge || existingEdge.nodeOrigem.usuarioId !== userId) {
    throw new Error("Relação não encontrada ou não pertence ao usuário");
  }

  const updateData: any = {};
  if (data.tipoRelacao) updateData.tipoRelacao = data.tipoRelacao;
  if (data.peso !== undefined) updateData.peso = data.peso;

  await prisma.conhecimentoAresta.update({
    where: { id: edgeId },
    data: updateData,
  });

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

  const edges = await prisma.conhecimentoAresta.findMany({
    where: { grafoId },
    include: {
      nodeOrigem: {
        include: {
          usuario: { select: { id: true } },
          // Resolve the actual entity based on tipoNode
        },
      },
      nodeDestino: {
        include: {
          usuario: { select: { id: true } },
        },
      },
    },
  });

  // Filter edges where both nodes belong to the user
  const userEdges = edges.filter(e => e.nodeOrigem.usuarioId === userId && e.nodeDestino.usuarioId === userId);

  // Resolve labels
  const result = await Promise.all(
    userEdges.map(async (edge) => {
      const sourceLabel = await resolveNodeLabel(edge.nodeOrigem);
      const targetLabel = await resolveNodeLabel(edge.nodeDestino);
      return {
        id: edge.id,
        source: edge.nodeOrigem.referenciaId,
        target: edge.nodeDestino.referenciaId,
        tipoRelacao: edge.tipoRelacao,
        peso: edge.peso,
        sourceLabel,
        targetLabel,
      };
    })
  );

  return result;
}

async function resolveNodeLabel(node: any): Promise<string> {
  const { tipoNode, referenciaId } = node;
  switch (tipoNode) {
    case "ASSUNTO": {
      const assunto = await prisma.assunto.findUnique({ where: { id: referenciaId } });
      return assunto?.nome ?? referenciaId;
    }
    case "TOPICO": {
      const topico = await prisma.topico.findUnique({ where: { id: referenciaId } });
      return topico?.nome ?? referenciaId;
    }
    case "CONCEITO": {
      const conceito = await prisma.conceito.findUnique({ where: { id: referenciaId } });
      return conceito?.nome ?? referenciaId;
    }
    case "FLASHCARD": {
      const flashcard = await prisma.flashcard.findUnique({ where: { id: referenciaId } });
      return flashcard?.pergunta?.slice(0, 50) ?? referenciaId;
    }
    case "NOTA": {
      const nota = await prisma.nota.findUnique({ where: { id: referenciaId } });
      if (nota?.titulo && nota.titulo !== "Sem título") return nota.titulo;
      return nota?.conteudo?.slice(0, 50) ?? referenciaId;
    }
    case "TEXTO_BRUTO": {
      const tb = await prisma.textoBruto.findUnique({ where: { id: referenciaId } });
      if (tb?.titulo && tb.titulo !== "Texto sem título") return tb.titulo;
      return tb?.texto?.slice(0, 50) ?? referenciaId;
    }
    default:
      return referenciaId;
  }
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

  let entityId: string;

  // Check if this is adding an existing entity (entityId provided) or creating a new one
  if (data.entityId) {
    // Adding existing entity - just create the nodeConhecimento link
    entityId = data.entityId;
  } else {
    // Create a new entity based on type
    const now = new Date();

    switch (tipoNode) {
      case "FLASHCARD": {
        const flashcard = await prisma.flashcard.create({
          data: {
            pergunta: data.pergunta,
            resposta: data.resposta,
            usuarioId: userId,
            dataCriacao: now,
          },
        });
        entityId = flashcard.id;
        break;
      }
      case "NOTA": {
        if (!data.titulo?.trim()) {
          throw new Error("O título da nota é obrigatório");
        }
        const tiposNota = ["LITERATURA", "PERMANENTE", "ESTRUTURA"];
        const tipoNota = data.tipoNota ?? "PERMANENTE";
        if (!tiposNota.includes(tipoNota)) {
          throw new Error(`Tipo de nota inválido: ${tipoNota}`);
        }
        // nota de literatura fica próxima da fonte original — fonte obrigatória
        if (tipoNota === "LITERATURA" && !data.fonte?.trim()) {
          throw new Error("Notas de referência (literatura) exigem a fonte");
        }
        if (!data.subtipo || !NOTA_SUBTIPOS.includes(data.subtipo)) {
          throw new Error("Selecione o subtipo da nota");
        }
        const nota = await prisma.nota.create({
          data: {
            titulo: data.titulo.trim(),
            tipoNota,
            subtipo: data.subtipo,
            fonte: data.fonte?.trim() || null,
            slug: buildNotaSlug(data.titulo.trim(), now),
            conteudo: data.conteudo,
            usuarioId: userId,
            dataCriacao: now,
          },
        });
        entityId = nota.id;
        break;
      }
      case "TEXTO_BRUTO": {
        if (!data.texto?.trim()) {
          throw new Error("O texto original é obrigatório");
        }
        const textoBruto = await prisma.textoBruto.create({
          data: {
            titulo: data.titulo?.trim() || "Texto sem título",
            texto: data.texto.trim(),
            usuarioId: userId,
            dataCriacao: now,
          },
        });
        entityId = textoBruto.id;
        break;
      }
      case "ASSUNTO": {
        const assunto = await prisma.assunto.create({
          data: {
            nome: data.nome,
            descricao: data.descricao,
            usuarioId: userId,
          },
        });
        entityId = assunto.id;
        break;
      }
      case "TOPICO": {
        const topico = await prisma.topico.create({
          data: {
            nome: data.nome,
            descricao: data.descricao,
            assuntoId: data.assuntoId || null,
            usuarioId: userId,
          },
        });
        entityId = topico.id;
        break;
      }
      case "CONCEITO": {
        const conceito = await prisma.conceito.create({
          data: {
            nome: data.nome,
            descricao: data.descricao,
            topicoId: data.topicoId || null,
            usuarioId: userId,
          },
        });
        entityId = conceito.id;
        break;
      }
      default:
        throw new Error(`Tipo de nó desconhecido: ${tipoNode}`);
    }
  }

  // Create the nodeConhecimento linking the entity to the graph
  await prisma.nodeConhecimento.create({
    data: {
      grafoId,
      tipoNode: tipoNode as any,
      referenciaId: entityId,
      usuarioId: userId,
      posicaoX: data.posicaoX ?? null,
      posicaoY: data.posicaoY ?? null,
      nivelDominio: data.nivelDominio ?? 0,
    },
  });

  revalidatePath(`/graph/${grafoId}`);
  return { success: true, nodeId: entityId };
}

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
