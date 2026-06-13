import { useEffect, useState } from "react";
import {
  getGraphNodes,
  getGrafoInfo,
  loadGraphVisualState,
} from "@/lib/graph-api";

export function useGraphData(graphId: string) {
  const [rawNodes, setRawNodes] = useState<any[]>([]);
  const [rawEdges, setRawEdges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [grafoNome, setGrafoNome] = useState("Mapa de Conhecimento");

  const [zoom, setZoom] = useState(0.6);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [graphEdges, setGraphEdges] = useState<any[]>([]);

  // LOAD GRAPH
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await getGraphNodes(graphId);

        const saved = await loadGraphVisualState(graphId);
        if (saved) {
          setZoom(saved.zoom);
          setPan(saved.pan);
        }

        setRawNodes(result.nodes);
        setRawEdges(result.edges);

        const edgesResult = await fetch(`/api/graph/edge?grafoId=${graphId}`).then(r => r.json());
        if (edgesResult.edges) {
          setGraphEdges(edgesResult.edges);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [graphId]);

  // LOAD NAME
  useEffect(() => {
    async function loadName() {
      try {
        const info = await getGrafoInfo(graphId);
        if (info) {
          setGrafoNome(info.nome);
        }
      } catch (e) {
        console.error(e);
      }
    }

    loadName();
  }, [graphId]);

  return {
    rawNodes,
    rawEdges,
    loading,
    grafoNome,
    setGrafoNome,
    zoom,
    setZoom,
    pan,
    setPan,
    graphEdges,
    setGraphEdges,
    setRawNodes,
    setRawEdges,
  };
}