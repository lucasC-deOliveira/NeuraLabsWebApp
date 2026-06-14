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

// Cores exatas convertidas de oklch(1 0 0) / oklch(0.145 0 0) do globals.css
// Passadas ao Three.js como hex para evitar problemas de parse com oklch
const BG_LIGHT = "#ffffff";
const BG_DARK  = "#0a0a0a";

export function Graph3DRenderer({
  nodes,
  edges,
  isDark,
  matchedIds,
  selectedNodeIds,
  onNodeClick,
}: Graph3DRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDims({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
      }
    };

    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // graphData estável: recria só quando os arrays de nós/arestas mudam de identidade
  const graphData = useMemo(() => ({
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

  const bg = isDark ? BG_DARK : BG_LIGHT;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ background: bg }}
    >
      <ForceGraph3D
        graphData={graphData}
        width={dims.w}
        height={dims.h}
        backgroundColor={bg}
        nodeColor={getNodeColor}
        nodeVal={getNodeVal}
        nodeLabel="label"
        nodeOpacity={0.92}
        linkColor={getLinkColor}
        linkWidth={1.2}
        linkOpacity={0.75}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        onNodeClick={(node: any) => onNodeClick(node as SimNode)}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        enableNodeDrag
        enableNavigationControls
        showNavInfo={false}
      />
    </div>
  );
}
