// Deterministic study-priority scoring for the roadmap's non-AI modes. Two signals,
// both concept-level and normalized to 0..1: past-exam frequency (TESTA edges) and
// edital coverage (COBRE edges). `prova_edital` averages them. Pure — no persistence.

export type RoadmapMode = 'ai' | 'prova' | 'edital' | 'prova_edital';
export const DETERMINISTIC_MODES: readonly RoadmapMode[] = ['prova', 'edital', 'prova_edital'];
const ALL_MODES: readonly RoadmapMode[] = ['ai', ...DETERMINISTIC_MODES];

export function isRoadmapMode(value: string): value is RoadmapMode {
  return (ALL_MODES as readonly string[]).includes(value);
}

export interface ConceitoSignal {
  refId: string;
  nome: string;
  provaFreq: number; // number of TESTA edges (past questions) pointing at the concept
  covered: boolean; // covered by some edital (COBRE edge)
  // How much the concept is worth in THIS exam, as declared on the node. null when
  // undeclared, which scores the same as the old boolean coverage did.
  pesoEdital?: number | null;
}

export interface ScoredConceito {
  refId: string;
  nome: string;
  provaFreq: number;
  score: number; // 0..1
  motivo: string;
}

// Peso de um conceito não declarado. 1 = neutro, o que reproduz exatamente a
// cobertura booleana de antes — sem pesos no grafo, o ranking não muda.
const PESO_NEUTRO = 1;

const pesoDe = (s: ConceitoSignal): number =>
  typeof s.pesoEdital === 'number' && s.pesoEdital > 0 ? s.pesoEdital : PESO_NEUTRO;

/** @example scoreConceitos(signals, 'prova_edital') */
export function scoreConceitos(
  signals: ConceitoSignal[],
  mode: Exclude<RoadmapMode, 'ai'>,
): ScoredConceito[] {
  const maxProva = Math.max(1, ...signals.map((s) => s.provaFreq));
  // Normalizado pelo maior peso presente, e não por um teto fixo: a escala é do
  // usuário (hoje 0.8–1.6), e um teto arbitrário achataria tudo.
  const maxPeso = Math.max(PESO_NEUTRO, ...signals.filter((s) => s.covered).map(pesoDe));
  return signals.map((s) => ({
    refId: s.refId,
    nome: s.nome,
    provaFreq: s.provaFreq,
    score: scoreOne(s, mode, maxProva, maxPeso),
    motivo: motivoFor(s, mode),
  }));
}

function scoreOne(
  s: ConceitoSignal,
  mode: Exclude<RoadmapMode, 'ai'>,
  maxProva: number,
  maxPeso: number,
): number {
  const prova = s.provaFreq / maxProva;
  // Estar no edital continua sendo a condição; o peso apenas gradua o quanto
  // vale. Fora do edital é 0 com ou sem peso declarado.
  const edital = s.covered ? pesoDe(s) / maxPeso : 0;
  if (mode === 'prova') return round2(prova);
  if (mode === 'edital') return round2(edital);
  return round2(0.5 * prova + 0.5 * edital);
}

function motivoFor(s: ConceitoSignal, mode: Exclude<RoadmapMode, 'ai'>): string {
  const prova = s.provaFreq > 0 ? `caiu em ${s.provaFreq} questão(ões)` : 'ainda não caiu em prova';
  const edital = editalMotivo(s);
  if (mode === 'prova') return capitalize(prova);
  if (mode === 'edital') return capitalize(edital);
  return `${capitalize(prova)} · ${edital}`;
}

// O peso entra no texto para o usuário entender por que dois tópicos igualmente
// cobrados pelo edital aparecem em posições diferentes.
function editalMotivo(s: ConceitoSignal): string {
  if (!s.covered) return 'fora do edital';
  const peso = s.pesoEdital;
  return typeof peso === 'number' && peso > 0
    ? `cobrado pelo edital (peso ${peso})`
    : 'cobrado pelo edital';
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
