"use server";

import { requireUserId } from "@/lib/auth";
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
