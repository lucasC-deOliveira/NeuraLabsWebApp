import { addDays, dateKey } from './date-key';
import { maturityMix } from './maturity-mix';
import type { LearningStateRow, ReviewRow } from '../ports/flashcard-analytics-source';
import type { ProfileAxis } from '../analytics-views';

// Resposta abaixo de FAST_MS pontua 100 em velocidade; acima de SLOW_MS, 0.
const FAST_MS = 3_000;
const SLOW_MS = 20_000;
const CONSISTENCY_WINDOW_DAYS = 14;

const clampPct = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

// Radar do estudo: seis dimensões normalizadas 0-100, um "raio-X" do desempenho.
export function performanceProfile(
  reviews: ReviewRow[],
  states: LearningStateRow[],
  now: Date,
): ProfileAxis[] {
  return [
    { axis: 'Acurácia', value: accuracyPct(reviews) },
    { axis: 'Velocidade', value: speedScore(reviews) },
    { axis: 'Confiança', value: confidenceScore(reviews) },
    { axis: 'Retenção', value: retentionScore(reviews) },
    { axis: 'Consistência', value: consistencyScore(reviews, now) },
    { axis: 'Maturidade', value: maturityScore(states) },
  ];
}

function accuracyPct(reviews: ReviewRow[]): number {
  if (!reviews.length) return 0;
  return clampPct((reviews.filter((r) => r.acertou).length / reviews.length) * 100);
}

function speedScore(reviews: ReviewRow[]): number {
  const times = reviews.map((r) => r.tempoResposta).filter((t): t is number => t != null && t > 0);
  if (!times.length) return 0;
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
  return clampPct(((SLOW_MS - avg) / (SLOW_MS - FAST_MS)) * 100);
}

function confidenceScore(reviews: ReviewRow[]): number {
  if (!reviews.length) return 0;
  const avg = reviews.reduce((sum, r) => sum + r.nivelConfianca, 0) / reviews.length;
  return clampPct(((avg - 1) / 4) * 100); // confiança 1-5 -> 0-100
}

// Retenção = recordação sólida: acertou COM alta confiança (>=4), não chute com sorte.
function retentionScore(reviews: ReviewRow[]): number {
  if (!reviews.length) return 0;
  const solid = reviews.filter((r) => r.acertou && r.nivelConfianca >= 4).length;
  return clampPct((solid / reviews.length) * 100);
}

// Consistência = fração dos últimos 14 dias com pelo menos uma revisão.
function consistencyScore(reviews: ReviewRow[], now: Date): number {
  const start = dateKey(addDays(now, -(CONSISTENCY_WINDOW_DAYS - 1)));
  const activeDays = new Set(
    reviews.map((r) => dateKey(r.data)).filter((key) => key >= start && key <= dateKey(now)),
  );
  return clampPct((activeDays.size / CONSISTENCY_WINDOW_DAYS) * 100);
}

function maturityScore(states: LearningStateRow[]): number {
  if (!states.length) return 0;
  const { mature } = maturityMix(states);
  return clampPct((mature / states.length) * 100);
}
