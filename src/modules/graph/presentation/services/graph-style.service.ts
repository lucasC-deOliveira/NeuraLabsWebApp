import { NODE_TYPE_COLORS } from "../../constants/graph-ui.constants";

// Node shapes
export type NodeShape = "circle" | "ellipse" | "rect" | "rect-vertical" | "square";

const NODE_TYPE_SHAPES: Record<string, NodeShape> = {
  ASSUNTO: "circle",
  TOPICO: "ellipse",
  CONCEITO: "rect",
  NOTA: "rect-vertical",
  FLASHCARD: "square",
};

export function getNodeShape(type: string): NodeShape {
  return NODE_TYPE_SHAPES[type] ?? "rect";
}

// Largura útil para o rótulo dentro de cada forma (formas curvas têm
// menos espaço nas laterais do que a caixa delimitadora sugere)
const SHAPE_LABEL_FACTOR: Record<NodeShape, number> = {
  circle: 0.78,
  ellipse: 0.85,
  rect: 1,
  "rect-vertical": 1,
  square: 1,
};

const CHAR_WIDTH = 6.6; // ~largura média de um caractere em fontSize 12
const LABEL_PADDING = 12;

/** Trunca o rótulo com reticências para caber na largura da forma do nó. */
export function truncateLabel(label: string, type: string, nodeWidth: number): string {
  const usable = nodeWidth * SHAPE_LABEL_FACTOR[getNodeShape(type)] - LABEL_PADDING;
  const maxChars = Math.max(3, Math.floor(usable / CHAR_WIDTH));
  if (label.length <= maxChars) return label;
  return `${label.slice(0, maxChars - 1)}…`;
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

// Relation colors — cada relação tem uma cor única em ambas as paletas
// (light: tons saturados/escuros para fundo claro; dark: tons claros para fundo escuro)
export const RELATION_COLORS: Record<string, { light: string; dark: string }> = {
  // Nota ↔ Conceito
  DEFINE: { light: "#0891b2", dark: "#22d3ee" },
  EXPLICA: { light: "#059669", dark: "#34d399" },
  APROFUNDA: { light: "#0d9488", dark: "#2dd4bf" },
  EXEMPLIFICA: { light: "#ea580c", dark: "#fb923c" },
  CONTRASTA: { light: "#e11d48", dark: "#fb7185" },
  SINTETIZA: { light: "#7c3aed", dark: "#a78bfa" },
  ALERTA_ERRO: { light: "#dc2626", dark: "#ef4444" },
  // Conceito ↔ Conceito
  IS_A: { light: "#2563eb", dark: "#60a5fa" },
  PART_OF: { light: "#0284c7", dark: "#38bdf8" },
  PREREQUISITO: { light: "#4f46e5", dark: "#818cf8" },
  DERIVA_DE: { light: "#16a34a", dark: "#4ade80" },
  EVOLUI_PARA: { light: "#65a30d", dark: "#a3e635" },
  REFORCA: { light: "#22c55e", dark: "#86efac" },
  ALTERNATIVA_A: { light: "#d97706", dark: "#fbbf24" },
  CONTRASTA_COM: { light: "#db2777", dark: "#f472b6" },
  CONFUNDE_COM: { light: "#c026d3", dark: "#e879f9" },
  ANTI_PADRAO_DE: { light: "#b91c1c", dark: "#f87171" },
  MEDIDO_POR: { light: "#0ea5e9", dark: "#67e8f9" },
  OBJETIVO_DE: { light: "#9333ea", dark: "#c084fc" },
  // Conceito ↔ Tópico / Tópico ↔ Assunto (azul-cobalto, índigo e turquesa vivos)
  PERTENCE_A: { light: "#1d4ed8", dark: "#93c5fd" },
  FUNDAMENTA: { light: "#4338ca", dark: "#a5b4fc" },
  APLICADO_EM: { light: "#14b8a6", dark: "#5eead4" },
  // Tópico ↔ Tópico
  SUBTOPICO_DE: { light: "#06b6d4", dark: "#a5f3fc" },
  RELACIONADO: { light: "#8b5cf6", dark: "#ddd6fe" },
  DEPENDE_DE: { light: "#6d28d9", dark: "#c4b5fd" },
  // Flashcard ↔ Conceito / Nota
  HERDA: { light: "#ca8a04", dark: "#facc15" },
  TESTA: { light: "#b45309", dark: "#f4a72f" },
  // Baralho → Flashcard
  CONTEM: { light: "#c2410c", dark: "#ffb877" },
  // Legadas
  GERA: { light: "#ef4444", dark: "#fca5a5" },
  REFERENCIA: { light: "#eab308", dark: "#fef08a" },
  TESTA_DEFINICAO: { light: "#f59e0b", dark: "#fcd34d" },
  TESTA_EXEMPLO: { light: "#84cc16", dark: "#fde047" },
  TESTA_APLICACAO: { light: "#f97316", dark: "#fdba74" },
  TESTA_ANALISE: { light: "#f43f5e", dark: "#fda4af" },
  TESTA_SINTESE: { light: "#a855f7", dark: "#d8b4fe" },
};

export function getRelationColor(type: string, isDark: boolean): string {
  const entry = RELATION_COLORS[type];
  return entry ? (isDark ? entry.dark : entry.light) : isDark ? "#94a3b8" : "#64748b";
}

// Dominio color (regra de negócio visual)
export function getDominioColor(dominio: number): string {
  if (dominio >= 0.7) return "#22c55e";
  if (dominio >= 0.4) return "#eab308";
  if (dominio > 0) return "#ef4444";
  return "#71717a";
}