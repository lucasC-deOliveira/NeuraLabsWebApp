import type { GraphNodeType, GraphEdgeType } from "@/actions/graph";

/**
 * Filtra nós por grupo (ASSUNTO, TOPICO, CONCEITO, etc)
 */
export function getFilteredNodes(
  layout: any[],
  filterGroup: string | null
) {
  if (!filterGroup) return layout;
  return layout.filter((n) => n.group === filterGroup);
}

/**
 * Retorna nodes visíveis em um conjunto
 */
export function getVisibleNodeIds(nodes: any[]) {
  return new Set(nodes.map((n) => n.id));
}

/**
 * Filtra edges considerando nodes visíveis
 */
export function getFilteredEdges(
  edges: any[],
  layout: any[],
  visibleNodeIds: Set<string>
) {
  return edges
    .map((e) => {
      const src = layout.find((n) => n.id === e.source);
      const tgt = layout.find((n) => n.id === e.target);

      return {
        ...e,
        sourceX: src?.x ?? e.sourceX,
        sourceY: src?.y ?? e.sourceY,
        targetX: tgt?.x ?? e.targetX,
        targetY: tgt?.y ?? e.targetY,
      };
    })
    .filter(
      (e) =>
        visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );
}

/**
 * Calcula estatísticas dos nós por tipo
 */
export function getNodeStats(rawNodes: any[]) {
  const counts: Record<string, number> = {};

  for (const n of rawNodes) {
    counts[n.type] = (counts[n.type] || 0) + 1;
  }

  return counts;
}

/**
 * Nodes conectados (vizinhança do grafo)
 */
export function getConnectedNodeIds(
  layout: any[],
  edges: any[],
  activeId?: string | null
) {
  if (!activeId) return new Set<string>();

  const connected = new Set<string>();
  connected.add(activeId);

  for (const e of edges) {
    if (e.source === activeId) connected.add(e.target);
    if (e.target === activeId) connected.add(e.source);
  }

  return connected;
}