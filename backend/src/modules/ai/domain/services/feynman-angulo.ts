// Os 3 ângulos da Técnica Feynman: explicar o MESMO conceito de formas diferentes.
// Cada ângulo tem uma régua própria para a IA — senão as 3 dariam a mesma nota.

export type FeynmanAngulo = 'SIMPLES' | 'ANALOGIA' | 'TECNICO';

export const FEYNMAN_ANGULOS: readonly FeynmanAngulo[] = ['SIMPLES', 'ANALOGIA', 'TECNICO'];

// Clareza mínima (0-100) para um ângulo contar como "claro".
export const FEYNMAN_CLARO = 70;

// Instrução por ângulo, injetada no prompt: o que a IA deve premiar/penalizar.
const RUBRICS: Record<FeynmanAngulo, string> = {
  SIMPLES:
    'MODO SIMPLES: explique como se ensinasse a uma criança. clareza mede a simplicidade; ' +
    'PENALIZE jargão não explicado e frases complexas.',
  ANALOGIA:
    'MODO ANALOGIA: a explicação deve girar em torno de UMA analogia/comparação do cotidiano. ' +
    'clareza mede o quanto a analogia sustenta o conceito (onde ela funciona e onde quebra).',
  TECNICO:
    'MODO TÉCNICO: explique com precisão, usando os termos corretos. Aqui o jargão é ESPERADO — ' +
    'clareza mede a exatidão técnica; em jargao liste apenas termos usados de forma ERRADA ou vaga.',
};

export function feynmanRubric(angulo: FeynmanAngulo): string {
  return RUBRICS[angulo];
}

// Rótulo do ângulo para o usuário (título da seção na nota do grafo).
const LABELS: Record<FeynmanAngulo, string> = {
  SIMPLES: 'Simples',
  ANALOGIA: 'Analogia',
  TECNICO: 'Técnico',
};

export function feynmanAnguloLabel(angulo: FeynmanAngulo): string {
  return LABELS[angulo];
}

// Normaliza a entrada da borda (query/body) para um ângulo válido; default SIMPLES.
export function parseFeynmanAngulo(raw: unknown): FeynmanAngulo {
  const up = String(raw ?? '').toUpperCase();
  return (FEYNMAN_ANGULOS as readonly string[]).includes(up) ? (up as FeynmanAngulo) : 'SIMPLES';
}

// A sessão está completa quando os 3 ângulos foram avaliados e todos ficaram claros.
export function isFeynmanSessionComplete(clarezaPorAngulo: Map<FeynmanAngulo, number>): boolean {
  return FEYNMAN_ANGULOS.every((a) => (clarezaPorAngulo.get(a) ?? -1) >= FEYNMAN_CLARO);
}
