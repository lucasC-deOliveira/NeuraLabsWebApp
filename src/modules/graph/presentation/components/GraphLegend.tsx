"use client";

import {
  getNodeColors,
  getNodeShape,
} from "@/modules/graph/presentation/services/graph-style.service";
import { NODE_TYPE_DISPLAY } from "@/modules/graph/constants/graph-ui.constants";

function LegendSwatch({ type, isDark }: { type: string; isDark: boolean }) {
  const colors = getNodeColors(type, isDark);
  const shape = getNodeShape(type);

  return (
    <svg width={22} height={18} aria-hidden="true">
      {shape === "ellipse" && (
        <ellipse cx={11} cy={9} rx={10} ry={6} fill={colors.bg} stroke={colors.border} strokeWidth={1.5} />
      )}
      {shape === "rect" && (
        <rect x={1} y={4.5} width={20} height={9} rx={2} fill={colors.bg} stroke={colors.border} strokeWidth={1.5} />
      )}
      {shape === "square" && (
        <rect x={5} y={3} width={12} height={12} rx={1} fill={colors.bg} stroke={colors.border} strokeWidth={1.5} />
      )}
      {shape === "rect-vertical" && (
        <rect x={6.5} y={2} width={9} height={14} rx={1} fill={colors.bg} stroke={colors.border} strokeWidth={1.5} />
      )}
      {shape === "diamond" && (
        <polygon points="11,1.5 20,9 11,16.5 2,9" fill={colors.bg} stroke={colors.border} strokeWidth={1.5} />
      )}
    </svg>
  );
}

export function GraphLegend({ isDark }: { isDark: boolean }) {
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 rounded-md border bg-background/90 backdrop-blur-sm px-4 py-1.5 shadow-sm">
      {Object.entries(NODE_TYPE_DISPLAY).map(([type, { label }]) => (
        <div key={type} className="flex items-center gap-1.5">
          <LegendSwatch type={type} isDark={isDark} />
          <span className="text-xs text-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}
