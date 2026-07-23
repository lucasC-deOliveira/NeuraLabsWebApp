"use client";

import type { MiniGraphModel, MiniNode } from "./mini-graph.types";

const NODE_W = 168;
const NODE_H = 30;
// Cores por camada: item = cor do tema; conceito/tópico/assunto = trio categórico.
const LAYER_COLOR = ["var(--primary)", "#8b5cf6", "#3b82f6", "#10b981"];
const LAYER_NAME = ["Item", "Conceito", "Tópico", "Assunto"];

function trim(label: string): string {
  return label.length > 24 ? `${label.slice(0, 23)}…` : label;
}

function NodeRect({ node }: { node: MiniNode }) {
  const color = LAYER_COLOR[node.layer] ?? LAYER_COLOR[0];
  return (
    <g>
      <rect
        x={node.x}
        y={node.y - NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        rx={7}
        fill={color}
        fillOpacity={0.14}
        stroke={color}
        strokeOpacity={0.9}
        strokeWidth={1.5}
      />
      <text x={node.x + NODE_W / 2} y={node.y} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="currentColor">
        {trim(node.label)}
      </text>
    </g>
  );
}

// Desenha o mini-grafo em SVG. Rola horizontalmente se ficar largo.
export function MiniGraph({ model }: { model: MiniGraphModel }) {
  const at = new Map(model.nodes.map((n) => [n.id, n]));
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${model.width} ${model.height}`} width={model.width} height={model.height} className="max-w-none text-foreground">
          {model.edges.map((e) => {
            const a = at.get(e.from);
            const b = at.get(e.to);
            if (!a || !b) return null;
            return (
              <line key={`${e.from}-${e.to}`} x1={a.x + NODE_W} y1={a.y} x2={b.x} y2={b.y} stroke="var(--border)" strokeWidth={1.5} />
            );
          })}
          {model.nodes.map((n) => <NodeRect key={n.id} node={n} />)}
        </svg>
      </div>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {LAYER_NAME.map((name, i) => (
        <span key={name} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: LAYER_COLOR[i] }} />
          {name}
        </span>
      ))}
    </div>
  );
}
