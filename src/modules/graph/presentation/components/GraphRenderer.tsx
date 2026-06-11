"use client";

import { useEffect, useMemo } from "react";
import {
  getNodeColors,
  getNodeShape,
  getRelationColor,
} from "@/modules/graph/presentation/services/graph-style.service";

function NodeShapeElement({
  shape,
  width,
  height,
  fill,
  stroke,
  strokeWidth = 2,
}: {
  shape: ReturnType<typeof getNodeShape>;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth?: number;
}) {
  const hw = width / 2;
  const hh = height / 2;

  switch (shape) {
    case "ellipse":
      return <ellipse rx={hw} ry={hh} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    case "diamond":
      return (
        <polygon
          points={`0,${-hh} ${hw},0 0,${hh} ${-hw},0`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
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
          strokeWidth={strokeWidth}
        />
      );
  }
}

// Ponto na borda do nó na direção (dirX, dirY) a partir do centro —
// faz a aresta partir do contorno da forma, não do centro
function boundaryPoint(
  node: { x: number; y: number; width: number; height: number; group: string },
  dirX: number,
  dirY: number,
) {
  const hw = node.width / 2;
  const hh = node.height / 2;
  const len = Math.hypot(dirX, dirY) || 1;
  const ux = dirX / len;
  const uy = dirY / len;

  let r: number;
  switch (getNodeShape(node.group)) {
    case "ellipse":
      r = (hw * hh) / (Math.hypot(hh * ux, hw * uy) || 1);
      break;
    case "diamond":
      r = 1 / (Math.abs(ux) / hw + Math.abs(uy) / hh || 1);
      break;
    default: {
      // retângulos: interseção com a borda da caixa
      const rx = Math.abs(ux) > 1e-6 ? hw / Math.abs(ux) : Infinity;
      const ry = Math.abs(uy) > 1e-6 ? hh / Math.abs(uy) : Infinity;
      r = Math.min(rx, ry);
    }
  }
  return { x: node.x + ux * r, y: node.y + uy * r };
}

export type GraphTool = "select" | "marquee" | "hand";

type MarqueeRect = { x1: number; y1: number; x2: number; y2: number };

const TOOL_CURSORS: Record<GraphTool, string> = {
  select: "cursor-default",
  marquee: "cursor-crosshair",
  hand: "cursor-grab active:cursor-grabbing",
};

type Props = {
  nodes: any[];
  edges: any[];
  zoom: number;
  pan: { x: number; y: number };
  isDark: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;

  tool: GraphTool;
  selectedNodeIds: Set<string>;
  marquee: MarqueeRect | null;

  onNodeClick: (node: any, additive?: boolean) => void;
  onNodeDragStart: (nodeId: string, e: PointerEvent) => void;
  onPanStart: (clientX: number, clientY: number) => void;
  onMarqueeStart: (clientX: number, clientY: number) => void;
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
  tool,
  selectedNodeIds,
  marquee,
  onNodeClick,
  onNodeDragStart,
  onPanStart,
  onMarqueeStart,
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

  const nodeById = useMemo(
    () => new Map<string, any>(nodes.map((n: any) => [n.id, n])),
    [nodes]
  );

  return (
    <svg
      ref={svgRef}
      className={`w-full h-full select-none ${TOOL_CURSORS[tool]}`}
      onPointerDown={(e) => {
        // mão: arrasta o grafo de qualquer lugar, inclusive sobre nós
        if (tool === "hand") {
          onPanStart(e.clientX, e.clientY);
          return;
        }
        // seleção múltipla: inicia o retângulo de qualquer lugar
        if (tool === "marquee") {
          onMarqueeStart(e.clientX, e.clientY);
          return;
        }
        // seleção: espaço vazio faz pan (nós tratam o próprio pointer down)
        const target = e.target as SVGElement | null;
        const isNode =
          target instanceof SVGElement &&
          target.parentElement?.getAttribute("data-node") === "true";
        if (isNode) return;
        onPanStart(e.clientX, e.clientY);
      }}
    >
      {/* fundo quadriculado — acompanha pan/zoom como no Figma */}
      <defs>
        <pattern
          id="graph-grid"
          width={32}
          height={32}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${pan.x},${pan.y}) scale(${zoom})`}
        >
          <path
            d="M 32 0 H 0 V 32"
            fill="none"
            stroke={isDark ? "#27272a" : "#e4e4e7"}
            strokeWidth={1}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#graph-grid)" pointerEvents="none" />

      <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

        {/* EDGES — curvas suaves, partindo da borda dos nós, com rótulo inclinado */}
        {edges.map((edge: any, i: number) => {
          const src = nodeById.get(edge.source);
          const tgt = nodeById.get(edge.target);
          if (!src || !tgt) return null;

          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.hypot(dx, dy) || 1;

          // ponto de controle perpendicular ao meio do segmento (curvatura)
          const off = Math.min(40, Math.max(14, dist * 0.12));
          const cx = (src.x + tgt.x) / 2 + (-dy / dist) * off;
          const cy = (src.y + tgt.y) / 2 + (dx / dist) * off;

          // pontas na borda das formas, apontando para o controle
          const p0 = boundaryPoint(src, cx - src.x, cy - src.y);
          const p2 = boundaryPoint(tgt, cx - tgt.x, cy - tgt.y);

          // ponto médio da curva quadrática (t = 0.5) para ancorar o rótulo
          const qx = 0.25 * p0.x + 0.5 * cx + 0.25 * p2.x;
          const qy = 0.25 * p0.y + 0.5 * cy + 0.25 * p2.y;

          // inclinação do rótulo = inclinação da corda, sem texto de cabeça para baixo
          let angle = (Math.atan2(p2.y - p0.y, p2.x - p0.x) * 180) / Math.PI;
          if (angle > 90) angle -= 180;
          if (angle < -90) angle += 180;

          const color = getRelationColor(edge.type, isDark);

          return (
            <g key={`${edge.source}-${edge.target}-${i}`}>
              <path
                d={`M ${p0.x} ${p0.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
              />
              <text
                x={qx}
                y={qy - 5}
                transform={`rotate(${angle} ${qx} ${qy})`}
                textAnchor="middle"
                fontSize={9}
                fill={color}
              >
                {edge.label ?? edge.type?.toLowerCase()}
              </text>
            </g>
          );
        })}

        {/* NODES */}
        {nodes.map((node: any) => {
          const colors = getNodeColors(node.group, isDark);
          const shape = getNodeShape(node.group);
          const isSelected = selectedNodeIds.has(node.id);

          return (
            <g
              key={node.id}
              data-node="true"
              transform={`translate(${node.x},${node.y})`}

              // =========================
              // DRAG NODE (FIX ESTABILIZADO)
              // só na ferramenta de seleção; nas demais o evento sobe
              // para o svg (pan da mão / retângulo do marquee)
              // =========================
              onPointerDown={(e) => {
                if (tool !== "select") return;
                e.stopPropagation();

                // evita perder drag no meio do zoom/pan
                (e.currentTarget as any).setPointerCapture(e.pointerId);

                onNodeDragStart(node.id, e.nativeEvent);
              }}

              onClick={(e) => {
                if (tool !== "select") return;
                e.stopPropagation();
                // Ctrl/Cmd + clique: alterna o nó na seleção múltipla
                onNodeClick(node, e.ctrlKey || e.metaKey);
              }}

              onPointerEnter={() => onNodeHover(node.id)}
              onPointerLeave={() => onNodeHover(null)}
            >
              <NodeShapeElement
                shape={shape}
                width={node.width}
                height={node.height}
                fill={colors?.bg ?? "#ccc"}
                stroke={isSelected ? (isDark ? "#60a5fa" : "#2563eb") : colors?.border ?? "#333"}
                strokeWidth={isSelected ? 3.5 : 2}
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

        {/* MARQUEE (retângulo de seleção múltipla) */}
        {marquee && (
          <rect
            x={Math.min(marquee.x1, marquee.x2)}
            y={Math.min(marquee.y1, marquee.y2)}
            width={Math.abs(marquee.x2 - marquee.x1)}
            height={Math.abs(marquee.y2 - marquee.y1)}
            fill={isDark ? "rgba(96,165,250,0.12)" : "rgba(37,99,235,0.08)"}
            stroke={isDark ? "#60a5fa" : "#2563eb"}
            strokeWidth={1.5 / zoom}
            strokeDasharray={`${5 / zoom} ${4 / zoom}`}
            pointerEvents="none"
          />
        )}
      </g>
    </svg>
  );
}