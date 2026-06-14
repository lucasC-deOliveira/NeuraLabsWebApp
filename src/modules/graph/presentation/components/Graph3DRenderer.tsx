"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import { NODE_TYPE_COLORS } from "@/modules/graph/constants/graph-ui.constants";
import { getRelationColor } from "@/modules/graph/presentation/services/graph-style.service";
import type { SimNode, SimEdge } from "@/modules/graph/infra/layout/force-layout.engine";

interface Graph3DRendererProps {
  nodes: SimNode[];
  edges: SimEdge[];
  isDark: boolean;
  matchedIds: Set<string> | null;
  selectedNodeIds: Set<string>;
  onNodeClick: (node: SimNode) => void;
}

const NODE_VAL: Record<string, number> = {
  ASSUNTO: 18,
  TOPICO: 10,
  CONCEITO: 7,
  NOTA: 6,
  FLASHCARD: 5,
  TEXTO_BRUTO: 5,
  BARALHO: 9,
};

// Retorna a cor de fundo computada do elemento — fallback seguro (neutro, sem azul)
function readBg(el: HTMLElement, isDark: boolean): string {
  const computed = window.getComputedStyle(el).backgroundColor;
  // getComputedStyle devolve sempre rgb(...) ou rgba(...) no browser
  if (computed && !computed.startsWith("rgba(0,") && !computed.startsWith("rgba(0, 0, 0, 0)") && computed !== "transparent") {
    return computed;
  }
  return isDark ? "#09090b" : "#ffffff";
}

export function Graph3DRenderer({
  nodes,
  edges,
  isDark,
  matchedIds,
  selectedNodeIds,
  onNodeClick,
}: Graph3DRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  // Fallback neutro — sem azul. Será sobrescrito após montagem via readBg()
  const [bgColor, setBgColor] = useState<string>(isDark ? "#09090b" : "#ffffff");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setDims({ w: el.clientWidth, h: el.clientHeight });
    setBgColor(readBg(el, isDark));

    const obs = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setDims({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [isDark]);

  const graphData = useMemo(() => ({
    nodes: nodes.map((n) => ({ ...n })),
    links: edges.map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type,
      label: e.label,
    })),
  }), [nodes, edges]);

  const getNodeColor = useCallback((node: any): string => {
    if (selectedNodeIds.has(node.id)) return "#3b82f6";
    if (matchedIds && !matchedIds.has(node.id)) {
      return isDark ? "#374151" : "#d1d5db";
    }
    const entry = NODE_TYPE_COLORS[node.group as keyof typeof NODE_TYPE_COLORS];
    const palette = isDark ? entry?.dark : entry?.light;
    return palette?.border ?? "#6366f1";
  }, [isDark, matchedIds, selectedNodeIds]);

  const getNodeVal = useCallback((node: any) => NODE_VAL[node.group] ?? 7, []);

  const getLinkColor = useCallback((link: any) => {
    if (matchedIds) {
      const srcId = typeof link.source === "object" ? link.source.id : link.source;
      const tgtId = typeof link.target === "object" ? link.target.id : link.target;
      if (!matchedIds.has(srcId) || !matchedIds.has(tgtId)) {
        return isDark ? "rgba(55,65,81,0.2)" : "rgba(209,213,219,0.2)";
      }
    }
    const col = getRelationColor(link.type, isDark);
    return col + "99";
  }, [isDark, matchedIds]);

  const handleNodeClick = useCallback((node: any) => {
    onNodeClick(node as SimNode);
  }, [onNodeClick]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-background"
    >
      {dims.w > 0 && dims.h > 0 && (
        <ForceGraph3D
          graphData={graphData}
          width={dims.w}
          height={dims.h}
          backgroundColor={bgColor}
          nodeColor={getNodeColor}
          nodeVal={getNodeVal}
          nodeLabel="label"
          nodeOpacity={0.92}
          linkColor={getLinkColor}
          linkWidth={1.2}
          linkOpacity={0.75}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          onNodeClick={handleNodeClick}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          enableNodeDrag
          enableNavigationControls
          showNavInfo={false}
        />
      )}
    </div>
  );
}
