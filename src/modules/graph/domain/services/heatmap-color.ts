// Cor do mapa de calor de domínio: vermelho (não domina) → âmbar → verde (domina).
// Escala ABSOLUTA 0..1 de propósito — um nó só fica verde quando o domínio é alto
// de verdade, então a tela não mente dizendo que você sabe o que ainda não sabe.
// Lógica pura: recebe o domínio, devolve um hex.

const RED = [239, 68, 68]; // #ef4444
const AMBER = [245, 158, 11]; // #f59e0b
const GREEN = [34, 197, 94]; // #22c55e

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function mix(from: number[], to: number[], t: number): string {
  const [r, g, b] = [0, 1, 2].map((i) => lerp(from[i], to[i], t));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Hex da cor de domínio para `dominio` em 0..1 (fora da faixa é grampeado).
 * @example heatmapColor(0) // "#ef4444" (vermelho)  ·  heatmapColor(1) // "#22c55e"
 */
export function heatmapColor(dominio: number): string {
  const d = Math.max(0, Math.min(1, dominio));
  return d < 0.5 ? mix(RED, AMBER, d / 0.5) : mix(AMBER, GREEN, (d - 0.5) / 0.5);
}
