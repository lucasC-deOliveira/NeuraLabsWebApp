"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useTheme } from "next-themes";
import { nodeColor } from "./graph-colors";
import type { CompositionGraph, CompositionNode } from "./composition.types";

// Nó/aresta como o force-graph os manipula (x/y são injetados pela simulação).
interface FNode extends CompositionNode {
  x?: number;
  y?: number;
}
interface FLink {
  source: string | FNode;
  target: string | FNode;
  rel: string;
}

const LAYER_NAME: Record<string, string> = {
  ASSUNTO: "Assunto",
  TOPICO: "Tópico",
  CONCEITO: "Conceito",
  FLASHCARD: "Flashcard",
  QUESTION: "Questão",
  PROVA: "Prova",
  BARALHO: "Baralho",
};

function endId(end: string | FNode): string {
  return typeof end === "object" ? end.id : end;
}

function trim(label: string): string {
  return label.length > 22 ? `${label.slice(0, 21)}…` : label;
}

// Grau + adjacência (para tamanho do nó e destaque no hover).
function analyze(graph: CompositionGraph): { degree: Map<string, number>; adj: Map<string, Set<string>> } {
  const degree = new Map<string, number>();
  const adj = new Map<string, Set<string>>();
  const bump = (a: string, b: string): void => {
    degree.set(a, (degree.get(a) ?? 0) + 1);
    const set = adj.get(a) ?? new Set<string>();
    set.add(b);
    adj.set(a, set);
  };
  for (const e of graph.edges) {
    bump(e.source, e.target);
    bump(e.target, e.source);
  }
  return { degree, adj };
}

interface DrawContext {
  isDark: boolean;
  rootId: string;
  degree: Map<string, number>;
  highlight: Set<string> | null;
}

function radiusOf(node: FNode, ctx: DrawContext): number {
  const base = node.id === ctx.rootId ? 6 : 4;
  return base + Math.min(5, ctx.degree.get(node.id) ?? 0);
}

function drawNode(node: FNode, canvas: CanvasRenderingContext2D, scale: number, ctx: DrawContext): void {
  const dim = ctx.highlight !== null && !ctx.highlight.has(node.id);
  const r = radiusOf(node, ctx);
  canvas.globalAlpha = dim ? 0.15 : 1;
  canvas.beginPath();
  canvas.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
  canvas.fillStyle = nodeColor(node.type, ctx.isDark);
  canvas.fill();
  const showLabel = scale > 1.3 || node.id === ctx.rootId || Boolean(ctx.highlight?.has(node.id));
  if (showLabel) {
    canvas.font = `${11 / scale}px sans-serif`;
    canvas.textAlign = "center";
    canvas.textBaseline = "top";
    canvas.fillStyle = ctx.isDark ? "#e5e7eb" : "#111827";
    canvas.fillText(trim(node.label), node.x ?? 0, (node.y ?? 0) + r + 1);
  }
  canvas.globalAlpha = 1;
}

export function MiniGraph({ graph, onNodeClick }: {
  graph: CompositionGraph;
  onNodeClick?: (node: CompositionNode) => void;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<string | null>(null);
  const { degree, adj } = useMemo(() => analyze(graph), [graph]);
  const data = useMemo(
    () => ({ nodes: graph.nodes.map((n) => ({ ...n })), links: graph.edges.map((e) => ({ ...e })) }),
    [graph],
  );
  const rootId = graph.nodes[0]?.id ?? "";
  const highlight = hover ? new Set<string>([hover, ...(adj.get(hover) ?? [])]) : null;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return (): void => ro.disconnect();
  }, []);

  const drawCtx: DrawContext = { isDark, rootId, degree, highlight };
  return (
    <div className="space-y-3">
      <div ref={containerRef} className="overflow-hidden rounded-lg border bg-card/40">
        <ForceGraph2D<FNode, FLink>
          graphData={data}
          width={width}
          height={460}
          backgroundColor="rgba(0,0,0,0)"
          cooldownTicks={120}
          nodeRelSize={4}
          nodeLabel={(n) => n.label}
          nodeCanvasObject={(n, canvas, scale) => drawNode(n, canvas, scale, drawCtx)}
          nodePointerAreaPaint={(n, color, canvas) => {
            canvas.fillStyle = color;
            canvas.beginPath();
            canvas.arc(n.x ?? 0, n.y ?? 0, radiusOf(n, drawCtx) + 2, 0, 2 * Math.PI);
            canvas.fill();
          }}
          linkColor={(l) =>
            hover && (endId(l.source) === hover || endId(l.target) === hover)
              ? nodeColor("CONCEITO", isDark)
              : isDark
                ? "#3f3f46"
                : "#d4d4d8"
          }
          linkWidth={(l) => (hover && (endId(l.source) === hover || endId(l.target) === hover) ? 2 : 1)}
          onNodeHover={(n) => setHover(n ? n.id : null)}
          onNodeClick={(n) => onNodeClick?.({ id: n.id, type: n.type, label: n.label })}
          onNodeDragEnd={(n) => {
            n.fx = n.x;
            n.fy = n.y;
          }}
        />
      </div>
      <Legend graph={graph} />
    </div>
  );
}

function Legend({ graph }: { graph: CompositionGraph }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const types = [...new Set(graph.nodes.map((n) => n.type))];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {types.map((type) => (
        <span key={type} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: nodeColor(type, isDark) }} />
          {LAYER_NAME[type] ?? type}
        </span>
      ))}
    </div>
  );
}
