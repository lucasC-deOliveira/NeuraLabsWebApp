"use client";

import { useEffect, useRef } from "react";
import { getNodeColors } from "@/modules/graph/presentation/services/graph-style.service";

type Props = {
  nodes: any[];
  edges: any[];
  zoom: number;
  pan: { x: number; y: number };
  isDark: boolean;

  onNodeClick: (node: any) => void;
  onNodeDragStart: (nodeId: string, e: PointerEvent) => void;
  onPanStart: (e: PointerEvent) => void;
  onWheel: (e: WheelEvent) => void;
  onNodeHover: (nodeId: string | null) => void;
};

export function GraphRenderer({
  nodes,
  edges,
  zoom,
  pan,
  isDark,
  onNodeClick,
  onNodeDragStart,
  onPanStart,
  onWheel,
  onNodeHover,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  // =========================
  // WHEEL (FIX DEFINITIVO)
  // =========================
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      onWheel(e);
    };

    el.addEventListener("wheel", handler, { passive: false });

    return () => {
      el.removeEventListener("wheel", handler);
    };
  }, [onWheel]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full select-none"
   onPointerDown={(e) => {
  const target = e.target as SVGElement | null;

  const isNode =
    target instanceof SVGElement &&
    target.parentElement?.getAttribute("data-node") === "true";

  if (isNode) return;

  onPanStart(e.nativeEvent);
}}
    >
      <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

        {/* EDGES */}
        {edges.map((edge: any, i: number) => {
          if (!edge?.sourceX || !edge?.targetX) return null;

          return (
            <line
              key={`${edge.source}-${edge.target}-${i}`}
              x1={edge.sourceX}
              y1={edge.sourceY}
              x2={edge.targetX}
              y2={edge.targetY}
              stroke="#999"
            />
          );
        })}

        {/* NODES */}
        {nodes.map((node: any) => {
          const colors = getNodeColors(node.group, isDark);

          return (
            <g
              key={node.id}
              data-node="true"
              transform={`translate(${node.x},${node.y})`}

              // =========================
              // DRAG NODE (FIX ESTABILIZADO)
              // =========================
              onPointerDown={(e) => {
                e.stopPropagation();

                // evita perder drag no meio do zoom/pan
                (e.currentTarget as any).setPointerCapture(e.pointerId);

                onNodeDragStart(node.id, e.nativeEvent);
              }}

              onClick={(e) => {
                e.stopPropagation();
                onNodeClick(node);
              }}

              onPointerEnter={() => onNodeHover(node.id)}
              onPointerLeave={() => onNodeHover(null)}
            >
              <rect
                width={node.width}
                height={node.height}
                x={-node.width / 2}
                y={-node.height / 2}
                fill={colors?.bg ?? "#ccc"}
                stroke={colors?.border ?? "#333"}
              />

              <text
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}