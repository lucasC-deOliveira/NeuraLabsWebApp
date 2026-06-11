"use client";

import { useEffect } from "react";
import {
  getNodeColors,
  getNodeShape,
} from "@/modules/graph/presentation/services/graph-style.service";

function NodeShapeElement({
  shape,
  width,
  height,
  fill,
  stroke,
}: {
  shape: ReturnType<typeof getNodeShape>;
  width: number;
  height: number;
  fill: string;
  stroke: string;
}) {
  const hw = width / 2;
  const hh = height / 2;

  switch (shape) {
    case "ellipse":
      return <ellipse rx={hw} ry={hh} fill={fill} stroke={stroke} strokeWidth={2} />;
    case "diamond":
      return (
        <polygon
          points={`0,${-hh} ${hw},0 0,${hh} ${-hw},0`}
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
        />
      );
    // square e rect-vertical já chegam com width/height corretos do layout
    case "square":
    case "rect-vertical":
    case "rect":
    default:
      return (
        <rect
          width={width}
          height={height}
          x={-hw}
          y={-hh}
          rx={shape === "rect" ? 8 : 4}
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
        />
      );
  }
}

type Props = {
  nodes: any[];
  edges: any[];
  zoom: number;
  pan: { x: number; y: number };
  isDark: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;

  onNodeClick: (node: any) => void;
  onNodeDragStart: (nodeId: string, e: PointerEvent) => void;
  onPanStart: (clientX: number, clientY: number) => void;
  onWheel: (e: WheelEvent) => void;
  onNodeHover: (nodeId: string | null) => void;
};

export function GraphRenderer({
  nodes,
  edges,
  zoom,
  pan,
  isDark,
  svgRef,
  onNodeClick,
  onNodeDragStart,
  onPanStart,
  onWheel,
  onNodeHover,
}: Props) {
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      onWheel(e);
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [svgRef, onWheel]);

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
        onPanStart(e.clientX, e.clientY);
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
          const shape = getNodeShape(node.group);

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
              <NodeShapeElement
                shape={shape}
                width={node.width}
                height={node.height}
                fill={colors?.bg ?? "#ccc"}
                stroke={colors?.border ?? "#333"}
              />

              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill={colors?.text ?? (isDark ? "#e2e8f0" : "#1e293b")}
                fontSize={12}
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