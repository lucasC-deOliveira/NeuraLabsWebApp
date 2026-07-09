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
}

export interface ScoredConceito {
  refId: string;
  nome: string;
  provaFreq: number;
  score: number; // 0..1
  motivo: string;
}

/** @example scoreConceitos(signals, 'prova_edital') */
export function scoreConceitos(
  signals: ConceitoSignal[],
  mode: Exclude<RoadmapMode, 'ai'>,
): ScoredConceito[] {
  const maxProva = Math.max(1, ...signals.map((s) => s.provaFreq));
  return signals.map((s) => ({
    refId: s.refId,
    nome: s.nome,
    provaFreq: s.provaFreq,
    score: scoreOne(s, mode, maxProva),
    motivo: motivoFor(s, mode),
  }));
}

function scoreOne(s: ConceitoSignal, mode: Exclude<RoadmapMode, 'ai'>, maxProva: number): number {
  const prova = s.provaFreq / maxProva;
  const edital = s.covered ? 1 : 0;
  if (mode === 'prova') return round2(prova);
  if (mode === 'edital') return edital;
  return round2(0.5 * prova + 0.5 * edital);
}

function motivoFor(s: ConceitoSignal, mode: Exclude<RoadmapMode, 'ai'>): string {
  const prova = s.provaFreq > 0 ? `caiu em ${s.provaFreq} questão(ões)` : 'ainda não caiu em prova';
  const edital = s.covered ? 'cobrado pelo edital' : 'fora do edital';
  if (mode === 'prova') return capitalize(prova);
  if (mode === 'edital') return capitalize(edital);
  return `${capitalize(prova)} · ${edital}`;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
