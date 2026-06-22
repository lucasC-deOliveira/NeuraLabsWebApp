import { useEffect, useRef, useState, startTransition } from "react";
import { runForceLayout, SimNode, SimEdge } from "@/modules/graph/infra/layout/force-layout.engine";
import { deriveHierarchy } from "@/lib/graph-hierarchy";
import type { GraphNodeType, GraphEdgeType } from "@/lib/graph-api";

function nodeDim(type: string): { width: number; height: number } {
  switch (type) {
    case "ASSUNTO":    return { width: 84,  height: 84 };
    case "TOPICO":     return { width: 104, height: 56 };
    case "NOTA":       return { width: 68,  height: 84 };
    case "FLASHCARD":  return { width: 84,  height: 84 };
    default:           return { width: 104, height: 46 };
  }
}

const LARGE_LAYOUT_THRESHOLD = 400;

export function useGraphLayout(rawNodes: GraphNodeType[], rawEdges: GraphEdgeType[]) {
  // For large graphs, data lives in refs (never in React state) to avoid
  // reconciling 14k fibers via startTransition. A signal counter triggers
  // re-renders cheaply whenever the ref is updated.
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<SimEdge[]>([]);
  const [signal,  setSignal]  = useState(0);

  // Small graphs still use state so React can track changes normally
  const [smallNodes, setSmallNodes] = useState<SimNode[]>([]);
  const [smallEdges, setSmallEdges] = useState<SimEdge[]>([]);

  useEffect(() => {
    if (rawNodes.length === 0) return;

    const allPinned =
      rawNodes.length > LARGE_LAYOUT_THRESHOLD &&
      rawNodes.every((n) => n.posicaoX != null && n.posicaoY != null);

    if (allPinned) {
      // Large graph with saved positions: build in a setTimeout so the
      // current render can paint the loading state first, then process
      // synchronously in the background tick (no startTransition needed
      // because the result goes into a ref, not state).
      const tid = setTimeout(() => {
        const hierarchy = deriveHierarchy(rawNodes, rawEdges);
        nodesRef.current = rawNodes.map((n) => {
          const { width, height } = nodeDim(n.type);
          const hier = hierarchy.get(n.id);
          return {
            id: n.id, label: n.label, group: n.type,
            dominio: n.nivelDominio ?? 0,
            prioridadeRevisao: n.prioridadeRevisao ?? 5,
            parentId: hier?.parentId ?? n.parentId,
            clusterId: hier?.clusterId,
            subtreeIds: hier?.subtreeIds,
            pergunta: n.pergunta, tipoReal: n.type,
            x: n.posicaoX!, y: n.posicaoY!, vx: 0, vy: 0,
            width, height, pinned: true,
            isRoot: !!n.isRoot, fixed: !!n.isRoot,
          };
        });
        edgesRef.current = rawEdges.map((e) => ({
          source: e.source, target: e.target,
          label: e.type, type: e.type, peso: e.peso,
          sourceX: 0, sourceY: 0, targetX: 0, targetY: 0,
        }));
        // One cheap re-render to expose the new refs
        setSignal((v) => v + 1);
      }, 0);
      return () => clearTimeout(tid);
    }

    // Small graph: run force layout in setTimeout, use normal state
    const timeout = setTimeout(() => {
      const result = runForceLayout(rawNodes, rawEdges, 3000, 2000);
      startTransition(() => {
        setSmallNodes(result.nodes);
        setSmallEdges(result.edges);
      });
    }, 0);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawNodes, rawEdges]);

  const isLarge = nodesRef.current.length > 0;
  return {
    nodes: isLarge ? nodesRef.current : smallNodes,
    edges: isLarge ? edgesRef.current : smallEdges,
  };
}
