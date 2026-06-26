// Pure geometry/graph logic for extracting a set of nodes into a subgraph.

export interface Point {
  x: number;
  y: number;
}

export interface ExtractEdge {
  id: string;
  nodeOrigemId: string | null;
  nodeDestinoId: string | null;
}

// Average position of the extracted nodes — where the GRAFO_REF lands in the parent.
export function centroid(points: Point[]): Point {
  if (!points.length) return { x: 0, y: 0 };
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

// Edges crossing the boundary (not fully inside) — they must be rewired to the
// GRAFO_REF. Edges with both endpoints inside move into the child untouched.
export function externalEdges(edges: ExtractEdge[], innerNodeIds: Set<string>): ExtractEdge[] {
  return edges.filter(
    (e) => !(isInside(e.nodeOrigemId, innerNodeIds) && isInside(e.nodeDestinoId, innerNodeIds)),
  );
}

// New endpoints for a boundary edge: the inside end is redirected to the
// GRAFO_REF node, the outside end is kept as-is.
export function rewireEndpoints(
  edge: ExtractEdge,
  innerNodeIds: Set<string>,
  refNodeId: string,
): { nodeOrigemId: string | null; nodeDestinoId: string | null } {
  return {
    nodeOrigemId: isInside(edge.nodeOrigemId, innerNodeIds) ? refNodeId : edge.nodeOrigemId,
    nodeDestinoId: isInside(edge.nodeDestinoId, innerNodeIds) ? refNodeId : edge.nodeDestinoId,
  };
}

function isInside(nodeId: string | null, innerNodeIds: Set<string>): boolean {
  return nodeId !== null && innerNodeIds.has(nodeId);
}
