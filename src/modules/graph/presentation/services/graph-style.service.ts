import { NODE_TYPE_COLORS } from "../../constants/graph-ui.constants";

// Node shapes
export type NodeShape = "ellipse" | "rect" | "square" | "rect-vertical" | "diamond";

const NODE_TYPE_SHAPES: Record<string, NodeShape> = {
  ASSUNTO: "ellipse",
  TOPICO: "rect",
  CONCEITO: "square",
  NOTA: "rect-vertical",
  FLASHCARD: "diamond",
};

export function getNodeShape(type: string): NodeShape {
  return NODE_TYPE_SHAPES[type] ?? "rect";
}

// Node colors
export function getNodeColors(type: string, isDark: boolean) {
  const entry = NODE_TYPE_COLORS[type as keyof typeof NODE_TYPE_COLORS];

  if (!entry) {
    return isDark
      ? NODE_TYPE_COLORS.CONCEITO.dark
      : NODE_TYPE_COLORS.CONCEITO.light;
  }

  return isDark ? entry.dark : entry.light;
}

// Relation colors
export function getRelationColor(type: string, isDark: boolean): string {
  const REL_COLORS: Record<string, { light: string; dark: string }> = {
    GERA: { light: "#dc2626", dark: "#f87171" },
    REFERENCIA: { light: "#ca8a04", dark: "#facc15" },
    DEFINE: { light: "#0891b2", dark: "#22d3ee" },
    EXPLICA: { light: "#059669", dark: "#34d399" },
    APROFUNDA: { light: "#0d9488", dark: "#2dd4bf" },
    EXEMPLIFICA: { light: "#ea580c", dark: "#fb923c" },
    CONTRASTA: { light: "#e11d48", dark: "#fb7185" },
    SINTETIZA: { light: "#7c3aed", dark: "#a78bfa" },
    ALERTA_ERRO: { light: "#dc2626", dark: "#ef4444" },
    IS_A: { light: "#2563eb", dark: "#60a5fa" },
    PART_OF: { light: "#0891b2", dark: "#22d3ee" },
    PREREQUISITO: { light: "#6d28d9", dark: "#a78bfa" },
    DERIVA_DE: { light: "#0d9488", dark: "#2dd4bf" },
    EVOLUI_PARA: { light: "#0284c7", dark: "#38bdf8" },
    REFORCA: { light: "#059669", dark: "#34d399" },
    ALTERNATIVA_A: { light: "#ea580c", dark: "#fb923c" },
    CONTRASTA_COM: { light: "#e11d48", dark: "#fb7185" },
    CONFUNDE_COM: { light: "#c026d3", dark: "#e879f9" },
    ANTI_PADRAO_DE: { light: "#dc2626", dark: "#f87171" },
    MEDIDO_POR: { light: "#0891b2", dark: "#22d3ee" },
    OBJETIVO_DE: { light: "#7c3aed", dark: "#a78bfa" },
    PERTENCE_A: { light: "#64748b", dark: "#94a3b8" },
    FUNDAMENTA: { light: "#4f46e5", dark: "#818cf8" },
    APLICADO_EM: { light: "#0d9488", dark: "#2dd4bf" },
    SUBTOPICO_DE: { light: "#64748b", dark: "#94a3b8" },
    RELACIONADO: { light: "#475569", dark: "#94a3b8" },
    DEPENDE_DE: { light: "#7c3aed", dark: "#a78bfa" },
    HERDA: { light: "#4f46e5", dark: "#818cf8" },
    TESTA_DEFINICAO: { light: "#d97706", dark: "#fbbf24" },
    TESTA_EXEMPLO: { light: "#ca8a04", dark: "#facc15" },
    TESTA_APLICACAO: { light: "#ea580c", dark: "#fb923c" },
    TESTA_ANALISE: { light: "#e11d48", dark: "#fb7185" },
    TESTA_SINTESE: { light: "#7c3aed", dark: "#c084fc" },
  };

  const entry = REL_COLORS[type];
  return entry ? (isDark ? entry.dark : entry.light) : isDark ? "#94a3b8" : "#64748b";
}

// Dominio color (regra de negócio visual)
export function getDominioColor(dominio: number): string {
  if (dominio >= 0.7) return "#22c55e";
  if (dominio >= 0.4) return "#eab308";
  if (dominio > 0) return "#ef4444";
  return "#71717a";
}