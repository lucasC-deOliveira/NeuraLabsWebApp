import type { GraphNodeType, GraphEdgeType } from "@/actions/graph";

/**
 * Esconde os nós cujos tipos o usuário desativou (todos visíveis por padrão).
 */
export function getFilteredNodes(
  layout: any[],
  hiddenTypes: Set<string>
) {
  if (!hiddenTypes || hiddenTypes.size === 0) return layout;
  return layout.filter((n) => !hiddenTypes.has(n.group));
}

/**
 * Retorna nodes visíveis em um conjunto
 */
export function getVisibleNodeIds(nodes: any[]) {
  return new Set(nodes.map((n) => n.id));
}

/**
 * Nós cujo centro está dentro do retângulo de seleção (marquee).
 * O retângulo pode ser desenhado em qualquer direção (x1/x2, y1/y2 trocados).
 */
export function getNodesInRect(
  nodes: Array<{ id: string; x: number; y: number }>,
  rect: { x1: number; y1: number; x2: number; y2: number }
): string[] {
  const minX = Math.min(rect.x1, rect.x2);
  const maxX = Math.max(rect.x1, rect.x2);
  const minY = Math.min(rect.y1, rect.y2);
  const maxY = Math.max(rect.y1, rect.y2);
  return nodes
    .filter((n) => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY)
    .map((n) => n.id);
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