// Cor de território no mapa de calor: um conceito DOMINADO (pela régua das três
// evidências) vira dourado — território conquistado —, sobrepondo o gradiente de
// domínio. O resto segue o mapa de calor normal (vermelho→verde por nivelDominio).
// Lógica pura.
import { heatmapColor } from "./heatmap-color";

// Dourado da conquista. Distinto do verde do gradiente para "conquistado" saltar.
export const CONQUEST_GOLD = "#eab308"; // amber-500

/**
 * Cor de um nó no modo mapa de calor: dourado se o conceito está dominado, senão
 * o gradiente de domínio.
 * @example territoryColor(0.3, true) // "#eab308"  ·  territoryColor(0.3, false) // gradiente
 */
export function territoryColor(nivelDominio: number, conquered: boolean): string {
  return conquered ? CONQUEST_GOLD : heatmapColor(nivelDominio);
}
