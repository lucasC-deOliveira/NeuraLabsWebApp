import type { EdgeView, GraphEdgeType, GraphNodeType } from "../types/graph.types";

/** Projects existing vault relationships into the same read model as the relation panel.
 * @example const relations = vaultEdgeViews(nodes, edges)
 */
export function vaultEdgeViews(nodes: GraphNodeType[], edges: GraphEdgeType[]): EdgeView[] {
  const labels = new Map(nodes.map((node) => [node.id, node.label]));
  return edges.map((edge) => ({
    id: JSON.stringify([edge.source, edge.target, edge.type]),
    source: edge.source, target: edge.target, tipoRelacao: edge.type, peso: edge.peso,
    sourceLabel: labels.get(edge.source) ?? edge.source,
    targetLabel: labels.get(edge.target) ?? edge.target,
  }));
}
