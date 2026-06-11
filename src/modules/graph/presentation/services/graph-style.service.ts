import { NODE_TYPE_COLORS } from "../../constants/graph-ui.constants";

// Node shapes
export type NodeShape = "circle" | "ellipse" | "rect" | "rect-vertical";

const NODE_TYPE_SHAPES: Record<string, NodeShape> = {
  ASSUNTO: "circle",
  TOPICO: "ellipse",
  CONCEITO: "rect",
  NOTA: "rect-vertical",
  FLASHCARD: "rect-vertical",
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
  REFORCA: { light: "#15803d", dark: "#86efac" },
  ALTERNATIVA_A: { light: "#d97706", dark: "#fbbf24" },
  CONTRASTA_COM: { light: "#db2777", dark: "#f472b6" },
  CONFUNDE_COM: { light: "#c026d3", dark: "#e879f9" },
  ANTI_PADRAO_DE: { light: "#b91c1c", dark: "#f87171" },
  MEDIDO_POR: { light: "#0e7490", dark: "#67e8f9" },
  OBJETIVO_DE: { light: "#9333ea", dark: "#c084fc" },
  // Conceito ↔ Tópico / Tópico ↔ Assunto
  PERTENCE_A: { light: "#475569", dark: "#94a3b8" },
  FUNDAMENTA: { light: "#4338ca", dark: "#a5b4fc" },
  APLICADO_EM: { light: "#0f766e", dark: "#5eead4" },
  // Tópico ↔ Tópico
  SUBTOPICO_DE: { light: "#57534e", dark: "#a8a29e" },
  RELACIONADO: { light: "#52525b", dark: "#a1a1aa" },
  DEPENDE_DE: { light: "#6d28d9", dark: "#c4b5fd" },
  // Flashcard ↔ Conceito
  HERDA: { light: "#ca8a04", dark: "#facc15" },
  // Legadas
  GERA: { light: "#7f1d1d", dark: "#fca5a5" },
  REFERENCIA: { light: "#854d0e", dark: "#fef08a" },
  TESTA_DEFINICAO: { light: "#b45309", dark: "#fcd34d" },
  TESTA_EXEMPLO: { light: "#a16207", dark: "#fde047" },
  TESTA_APLICACAO: { light: "#9a3412", dark: "#fdba74" },
  TESTA_ANALISE: { light: "#be123c", dark: "#fda4af" },
  TESTA_SINTESE: { light: "#6b21a8", dark: "#d8b4fe" },
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