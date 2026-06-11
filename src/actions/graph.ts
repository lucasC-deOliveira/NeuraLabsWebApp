"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildKnowledgeGraph, getCriticalNodes as libGetCriticalNodes, type GraphNode, type GraphEdge, type TipoRelacao } from "@/lib/graph";

export interface GraphNodeType {
  id: string;
  label: string;
  type: "ASSUNTO" | "TOPICO" | "CONCEITO" | "FLASHCARD" | "NOTA";
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
      return nota?.textoBruto?.slice(0, 50) ?? referenciaId;
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
        const nota = await prisma.nota.create({
          data: {
            textoBruto: data.textoBruto,
            usuarioId: userId,
            dataCriacao: now,
          },
        });
        entityId = nota.id;
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
