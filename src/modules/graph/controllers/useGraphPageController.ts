import { getGraphNodes, GraphEdgeType, GraphNodeType } from "@/lib/graph-api";
import { useEffect, useState } from "react";

export function useGraphPageController(graphId: string) {
  const [rawNodes, setRawNodes] = useState<GraphNodeType[]>([]);
  const [rawEdges, setRawEdges] = useState<GraphEdgeType[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const result = await getGraphNodes(graphId);
      setRawNodes(result.nodes);
      setRawEdges(result.edges);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, [graphId]);

  return {
    rawNodes,
    rawEdges,
    loading,
    reload: loadGraph,
  };
}