"use client";

import {
  getNodeColors,
  getNodeShape,
  getRelationColor,
} from "@/modules/graph/presentation/services/graph-style.service";
import {
  NODE_TYPE_DISPLAY,
  RELATION_LABELS,
} from "@/modules/graph/constants/graph-ui.constants";
import { RELATION_PAIRS } from "@/modules/graph/domain/services/relation-rules";

const typeLabel = (type: string) =>
  (NODE_TYPE_DISPLAY[type as keyof typeof NODE_TYPE_DISPLAY]?.label ?? type).toLowerCase();

function LegendSwatch({ type, isDark }: { type: string; isDark: boolean }) {
  const colors = getNodeColors(type, isDark);
  const shape = getNodeShape(type);

  return (
    <svg width={22} height={18} aria-hidden="true">
      {shape === "circle" && (
        <circle cx={11} cy={9} r={7} fill={colors.bg} stroke={colors.border} strokeWidth={1.5} />
      )}
      {shape === "ellipse" && (
        <ellipse cx={11} cy={9} rx={10} ry={6} fill={colors.bg} stroke={colors.border} strokeWidth={1.5} />
      )}
      {shape === "rect" && (
        <rect x={1} y={4.5} width={20} height={9} rx={2} fill={colors.bg} stroke={colors.border} strokeWidth={1.5} />
      )}
      {shape === "rect-vertical" && (
        <rect x={6.5} y={2} width={9} height={14} rx={1} fill={colors.bg} stroke={colors.border} strokeWidth={1.5} />
      )}
    </svg>
  );
}

export function GraphLegend({ isDark }: { isDark: boolean }) {
  return (
    <div className="graph-toolbar absolute top-2 left-1/2 -translate-x-1/2 z-10 w-max max-w-[97%] max-h-[40%] overflow-y-auto rounded-md border border-primary/60 bg-background/90 backdrop-blur-sm px-5 py-2 shadow-sm">
      {/* Nós */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="text-xs font-semibold text-primary">Nós:</span>
        {Object.entries(NODE_TYPE_DISPLAY).map(([type, { label }]) => (
          <div key={type} className="flex items-center gap-1.5">
            <LegendSwatch type={type} isDark={isDark} />
            <span className="text-xs text-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Relações — todas as regras, agrupadas por par de tipos */}
      <div className="mt-1.5 space-y-0.5 border-t border-primary/30 pt-1.5">
        <span className="text-xs font-semibold text-primary">Relações:</span>
        {RELATION_PAIRS.map((pair) => (
          <div
            key={`${pair.a}-${pair.b}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-0.5"
          >
            <span className="text-[11px] font-medium text-muted-foreground">
              {typeLabel(pair.a)}–{typeLabel(pair.b)}:
            </span>
            {pair.relations.map((rel) => (
              <div key={rel} className="flex items-center gap-1">
                <svg width={16} height={8} aria-hidden="true">
                  <line
                    x1={1}
                    y1={4}
                    x2={15}
                    y2={4}
                    stroke={getRelationColor(rel, isDark)}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[11px] text-muted-foreground">
                  {RELATION_LABELS[rel] ?? rel.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
