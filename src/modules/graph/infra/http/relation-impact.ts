import { graphsContaining } from "@/lib/graph-api";
import type { LoadRelationImpact, RelationEndpoints, RelationImpactGraph } from "../../application/ports/relation-impact.port";

/** Finds all server graphs containing both endpoints of a shared relation.
 * @example const graphs = await serverRelationImpact(nodeTypes)(edge)
 */
export function serverRelationImpact(nodeTypes: ReadonlyMap<string, string>): LoadRelationImpact {
  return async ({ source, target }: RelationEndpoints): Promise<RelationImpactGraph[]> => {
    const sourceType = nodeTypes.get(source);
    const targetType = nodeTypes.get(target);
    if (!sourceType || !targetType) throw new Error("Não foi possível identificar os dois nós da relação.");
    const [sources, targets] = await Promise.all([
      graphsContaining(sourceType, source), graphsContaining(targetType, target),
    ]);
    const targetGraphs = new Set(targets.map(({ grafoId }) => grafoId));
    return sources.filter(({ grafoId }) => targetGraphs.has(grafoId))
      .map(({ grafoId, nome }) => ({ id: grafoId, name: nome }));
  };
}
