import type { FeynmanAngulo } from "./feynman.types";

// Ordem e textos de UI dos 3 ângulos da Técnica Feynman. O rótulo casa com o do
// backend (feynman-angulo.ts) para a nota do grafo ficar consistente.
export const FEYNMAN_ANGULOS: FeynmanAngulo[] = ["SIMPLES", "ANALOGIA", "TECNICO"];

export const ANGULO_META: Record<FeynmanAngulo, { label: string; hint: string }> = {
  SIMPLES: {
    label: "Simples",
    hint: "Explique como se ensinasse a uma criança — sem jargão.",
  },
  ANALOGIA: {
    label: "Analogia",
    hint: "Explique com UMA analogia do dia a dia — e diga onde ela funciona e onde quebra.",
  },
  TECNICO: {
    label: "Técnico",
    hint: "Explique com precisão e os termos corretos — como numa prova.",
  },
};

// Clareza mínima para um ângulo contar como "claro" (espelha FEYNMAN_CLARO do backend).
export const FEYNMAN_CLARO = 70;
