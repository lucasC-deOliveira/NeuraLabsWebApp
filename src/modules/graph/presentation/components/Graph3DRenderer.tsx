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

export function Graph3DRenderer({
  nodes,
  edges,
  isDark,
  matchedIds,
  selectedNodeIds,
  onNodeClick,
}: Graph3DRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Inicia com window size para nunca ser 0 no primeiro render
  const [dims, setDims] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 800,
    h: typeof window !== "undefined" ? window.innerHeight : 600,
  }));
  const [bgColor, setBgColor] = useState(isDark ? "#09090b" : "#ffffff");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDims({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
      }
      // Lê a cor de fundo real do CSS do tema
      const computed = window.getComputedStyle(el).backgroundColor;
      if (computed && !computed.startsWith("rgba(0,") && !computed.startsWith("rgba(0, 0, 0, 0)")) {
        setBgColor(computed);
      }
    };

    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, [isDark]);

  const graphData = useMemo(() => ({
    // Passa apenas os campos necessários — evita conflito com props internas do ForceGraph3D
    nodes: nodes.map(({ id, label, group, dominio, tipoReal, pergunta, prioridadeRevisao }) => ({
      id, label, group, dominio, tipoReal, pergunta, prioridadeRevisao,
    })),
    links: edges.map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type,
      label: e.label,
    })),
  }), [nodes, edges]);

  const getNodeColor = useCallback((node: any): string => {
    if (selectedNodeIds.has(node.id)) return "#3b82f6";
    if (matchedIds && !matchedIds.has(node.id)) return isDark ? "#374151" : "#d1d5db";
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
    return getRelationColor(link.type, isDark) + "99";
  }, [isDark, matchedIds]);

  const handleNodeClick = useCallback((node: any) => {
    onNodeClick(node as SimNode);
  }, [onNodeClick]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-background"
    >
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
    </div>
  );
}
