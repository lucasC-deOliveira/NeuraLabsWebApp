import { NODE_TYPE_COLORS } from "@/modules/graph/constants/graph-ui.constants";
import type { CompositionNodeType } from "./composition.types";

// Neutro para tipos sem cor mapeada (não deve ocorrer com os 7 tipos da composição).
const FALLBACK = { light: { border: "#64748b" }, dark: { border: "#94a3b8" } };

// Cor do nó por tipo, na MESMA paleta do grafo (NODE_TYPE_COLORS). Usa a borda
// (a cor viva) tanto para o preenchimento do círculo quanto para o traço.
export function nodeColor(type: CompositionNodeType, isDark: boolean): string {
  const entry = NODE_TYPE_COLORS[type as keyof typeof NODE_TYPE_COLORS] ?? FALLBACK;
  return (isDark ? entry.dark : entry.light).border;
}
