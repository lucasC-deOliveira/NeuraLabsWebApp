import { useEffect, useState } from "react";
import { runForceLayout, SimNode, SimEdge } from "@/modules/graph/infra/layout/force-layout.engine";
import type { GraphNodeType, GraphEdgeType } from "@/lib/graph-api";

export function useGraphLayout(
  rawNodes: GraphNodeType[],
  rawEdges: GraphEdgeType[],
) {
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [edges, setEdges] = useState<SimEdge[]>([]);

   useEffect(() => {
    if (rawNodes.length === 0) return;

    const timeout = setTimeout(() => {
      const result = runForceLayout(rawNodes, rawEdges, 3000, 2000);
      setNodes(result.nodes);
      setEdges(result.edges);
    }, 0);

    return () => clearTimeout(timeout);
  }, [rawNodes, rawEdges]);

  return { nodes, edges };
}