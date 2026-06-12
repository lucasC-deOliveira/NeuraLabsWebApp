"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  getNodeColors,
  getNodeShape,
  getRelationColor,
  truncateLabel,
} from "@/modules/graph/presentation/services/graph-style.service";
import { computeEdgeCurve } from "@/modules/graph/presentation/services/edge-geometry.service";

// formata o peso da relação compacto: 1 → "1", 0.6 → "0.6", 0.75 → "0.75"
function formatPeso(peso: unknown): string | null {
  if (typeof peso !== "number" || !Number.isFinite(peso)) return null;
  return String(Number(peso.toFixed(2)));
}

function NodeShapeElement({
  shape,
  width,
  height,
  fill,
  stroke,
  strokeWidth = 2,
  fillOpacity = 1,
}: {
  shape: ReturnType<typeof getNodeShape>;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth?: number;
  fillOpacity?: number;
}) {
  const hw = width / 2;
  const hh = height / 2;

  switch (shape) {
    case "circle":
      return <circle r={hw} fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeWidth} />;
    case "ellipse":
      return <ellipse rx={hw} ry={hh} fill={fill} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeWidth} />;
    // rect, rect-vertical e square já chegam com width/height corretos do layout
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
          rx={shape === "square" ? 14 : shape === "rect" ? 8 : 6}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
  }
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
  // alto contraste: nós e arestas todos na cor primária do tema
  highContrast?: boolean;
  // destaque de conexões: ao selecionar um nó, ofusca o que não é vizinho
  focusMode?: boolean;
  // quantos saltos a cadeia de relações percorre a partir do nó selecionado
  focusDepth?: number;
  // busca/filtros: quando não-nulo, só os ids deste conjunto ficam em destaque
  // (os demais são esmaecidos). Nulo = sem filtro ativo.
  matchedIds?: Set<string> | null;

  onNodeClick: (node: any, additive?: boolean) => void;
  onNodeContextMenu?: (node: any, clientX: number, clientY: number) => void;
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
  highContrast = false,
  focusMode = false,
  focusDepth = 1,
  matchedIds = null,
  onNodeClick,
  onNodeContextMenu,
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

  // destaque de conexões: ativo só quando há nó selecionado
  const focusActive = focusMode && selectedNodeIds.size > 0;
  // cadeia = nós alcançáveis a partir dos selecionados em até `focusDepth` saltos (BFS)
  const reachableIds = useMemo(() => {
    if (!focusActive) return null;
    const depth = Math.max(1, Math.floor(focusDepth));
    const adj = new Map<string, string[]>();
    for (const e of edges) {
      (adj.get(e.source) ?? adj.set(e.source, []).get(e.source)!).push(e.target);
      (adj.get(e.target) ?? adj.set(e.target, []).get(e.target)!).push(e.source);
    }
    const dist = new Map<string, number>();
    const queue: string[] = [];
    for (const id of selectedNodeIds) {
      dist.set(id, 0);
      queue.push(id);
    }
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const d = dist.get(cur)!;
      if (d >= depth) continue;
      for (const nb of adj.get(cur) ?? []) {
        if (!dist.has(nb)) {
          dist.set(nb, d + 1);
          queue.push(nb);
        }
      }
    }
    return new Set(dist.keys());
  }, [focusActive, selectedNodeIds, edges, focusDepth]);
  const DIM = 0.12;

  // distingue clique de arrasto: só limpa a seleção em clique parado no vazio
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  return (
    <svg
      ref={svgRef}
      className={`w-full h-full select-none ${TOOL_CURSORS[tool]}`}
      onPointerDown={(e) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
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
      onClick={(e) => {
        // clique parado no vazio (ferramenta de seleção) limpa a seleção;
        // arrasto de pan não limpa
        if (tool !== "select") return;
        const target = e.target as SVGElement | null;
        const isNode =
          target instanceof SVGElement &&
          target.parentElement?.getAttribute("data-node") === "true";
        if (isNode) return;
        const down = pointerDownPos.current;
        if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
        onNodeClick(null);
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
            // cor primária do tema bem desbotada — acompanha o tema ativo
            stroke="var(--primary)"
            strokeOpacity={isDark ? 0.16 : 0.18}
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

          const { p0, p2, cx, cy, qx, qy, angle, endTangent } = computeEdgeCurve(src, tgt);
          const color = highContrast ? "var(--primary)" : getRelationColor(edge.type, isDark);

          // seta no nó de destino, alinhada à tangente final da curva
          const ARROW_LEN = 9;
          const ARROW_W = 4.5;
          const baseX = p2.x - endTangent.x * ARROW_LEN;
          const baseY = p2.y - endTangent.y * ARROW_LEN;
          const perpX = -endTangent.y;
          const perpY = endTangent.x;
          const arrowPoints = `${p2.x},${p2.y} ${baseX + perpX * ARROW_W},${baseY + perpY * ARROW_W} ${baseX - perpX * ARROW_W},${baseY - perpY * ARROW_W}`;

          // no modo destaque, só arestas dentro da cadeia (ambas as pontas alcançáveis) ficam visíveis
          const focusOk = !focusActive || (reachableIds!.has(edge.source) && reachableIds!.has(edge.target));
          // na busca, só arestas entre dois nós correspondentes ficam vivas
          const matchOk = !matchedIds || (matchedIds.has(edge.source) && matchedIds.has(edge.target));
          const edgeActive = focusOk && matchOk;

          return (
            <g
              key={`${edge.source}-${edge.target}-${i}`}
              style={{ opacity: edgeActive ? 1 : DIM, transition: "opacity 0.15s" }}
            >
              <path
                d={`M ${p0.x} ${p0.y} Q ${cx} ${cy} ${baseX} ${baseY}`}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
              />
              <polygon points={arrowPoints} fill={color} />
              <text
                x={qx}
                y={qy - 5}
                transform={`rotate(${angle} ${qx} ${qy})`}
                textAnchor="middle"
                fontSize={9}
                fill={color}
              >
                {edge.label ?? edge.type?.toLowerCase()}
                {formatPeso(edge.peso) && (
                  <tspan dx={3} fontSize={7.5} fillOpacity={0.65} fontStyle="italic">
                    ({formatPeso(edge.peso)})
                  </tspan>
                )}
              </text>
            </g>
          );
        })}

        {/* NODES */}
        {nodes.map((node: any) => {
          const colors = getNodeColors(node.group, isDark);
          const shape = getNodeShape(node.group);
          const isSelected = selectedNodeIds.has(node.id);
          // ofusca nós fora da cadeia (destaque) ou fora da busca (filtros)
          const dimmed =
            (focusActive && !reachableIds!.has(node.id)) ||
            (matchedIds != null && !matchedIds.has(node.id));

          return (
            <g
              key={node.id}
              data-node="true"
              transform={`translate(${node.x},${node.y})`}
              style={{ opacity: dimmed ? DIM : 1, transition: "opacity 0.15s" }}

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

              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNodeContextMenu?.(node, e.clientX, e.clientY);
              }}

              onPointerEnter={() => onNodeHover(node.id)}
              onPointerLeave={() => onNodeHover(null)}
            >
              <NodeShapeElement
                shape={shape}
                width={node.width}
                height={node.height}
                fill={highContrast ? "var(--primary)" : colors?.bg ?? "#ccc"}
                fillOpacity={highContrast ? 0.12 : 1}
                stroke={
                  highContrast
                    ? "var(--primary)"
                    : isSelected
                    ? (isDark ? "#60a5fa" : "#2563eb")
                    : colors?.border ?? "#333"
                }
                strokeWidth={isSelected ? 3.5 : 2}
              />

              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill={highContrast ? "var(--primary)" : colors?.text ?? (isDark ? "#e2e8f0" : "#1e293b")}
                fontSize={12}
              >
                {truncateLabel(node.label ?? "", node.group, node.width)}
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