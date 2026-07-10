// Pure selectors over the graph layout/edges. Generic over minimal structural shapes
// so callers keep their concrete node/edge types (SimNode etc.) without the domain
// importing infra/presentation types.

/**
 * Esconde os nós cujos tipos o usuário desativou (todos visíveis por padrão).
 */
export function getFilteredNodes<T extends { group: string }>(layout: T[], hiddenTypes: Set<string>): T[] {
  if (!hiddenTypes || hiddenTypes.size === 0) return layout;
  return layout.filter((n) => !hiddenTypes.has(n.group));
}

/**
 * Retorna nodes visíveis em um conjunto
 */
export function getVisibleNodeIds<T extends { id: string }>(nodes: T[]): Set<string> {
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
 * Filtra edges considerando nodes visíveis.
 * Coordenadas não são copiadas aqui: o GraphRenderer lê posições
 * diretamente do nodeById Map (nodes atualizados frame a frame).
 */
export function getFilteredEdges<T extends { source: string; target: string }>(
  edges: T[],
  visibleNodeIds: Set<string>
): T[] {
  return edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
}

/**
 * Arestas visíveis: oculta as de relação desativada pelo usuário e, quando
 * `visibleNodeIds` é dado (grafo pequeno), também as que tocam nós ocultos.
 * `visibleNodeIds === null` (grafo grande) pula o filtro por nó — o Canvas culla.
 */
export function getVisibleEdges<T extends { source: string; target: string; type: string }>(
  edges: T[],
  visibleNodeIds: Set<string> | null,
  hiddenRelations: Set<string>
): T[] {
  return edges.filter((e) => isEdgeVisible(e, visibleNodeIds, hiddenRelations));
}

function isEdgeVisible(
  edge: { source: string; target: string; type: string },
  visibleNodeIds: Set<string> | null,
  hiddenRelations: Set<string>
): boolean {
  if (hiddenRelations.has(edge.type)) return false;
  if (!visibleNodeIds) return true;
  return visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target);
}

/**
 * Estatísticas das arestas por tipo de relação.
 */
export function getRelationStats<T extends { type: string }>(edges: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of edges) counts[e.type] = (counts[e.type] || 0) + 1;
  return counts;
}

/**
 * Calcula estatísticas dos nós por tipo
 */
export function getNodeStats<T extends { type: string }>(rawNodes: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const n of rawNodes) {
    counts[n.type] = (counts[n.type] || 0) + 1;
  }
  return counts;
}

/**
 * Nodes conectados (vizinhança do grafo). `layout` é aceito por compatibilidade
 * com os chamadores; a vizinhança é derivada apenas das arestas.
 */
export function getConnectedNodeIds<E extends { source: string; target: string }>(
  layout: readonly unknown[],
  edges: E[],
  activeId?: string | null
): Set<string> {
  void layout;
  if (!activeId) return new Set<string>();

  const connected = new Set<string>();
  connected.add(activeId);

  for (const e of edges) {
    if (e.source === activeId) connected.add(e.target);
    if (e.target === activeId) connected.add(e.source);
  }

  return connected;
}
