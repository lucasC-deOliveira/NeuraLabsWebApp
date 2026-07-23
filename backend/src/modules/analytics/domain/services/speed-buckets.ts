import type { ReviewRow } from '../ports/flashcard-analytics-source';
import type { SpeedBucket } from '../analytics-views';

// Faixas de tempo de resposta (ms). Responde à pergunta: acerto cai quando você
// demora (ou apressa)?
const BUCKETS: { label: string; maxMs: number }[] = [
  { label: '< 3s', maxMs: 3_000 },
  { label: '3–8s', maxMs: 8_000 },
  { label: '8–15s', maxMs: 15_000 },
  { label: '> 15s', maxMs: Infinity },
];

function bucketLabel(ms: number): string {
  return BUCKETS.find((b) => ms < b.maxMs)!.label;
}

// Acurácia (0-100) e nº de revisões por faixa de velocidade, na ordem das faixas.
export function speedBuckets(reviews: ReviewRow[]): SpeedBucket[] {
  const stats = new Map<string, { correct: number; total: number }>();
  for (const review of reviews) {
    if (review.tempoResposta == null || review.tempoResposta <= 0) continue;
    const key = bucketLabel(review.tempoResposta);
    const stat = stats.get(key) ?? { correct: 0, total: 0 };
    stat.total++;
    if (review.acertou) stat.correct++;
    stats.set(key, stat);
  }
  return BUCKETS.filter((b) => stats.has(b.label)).map((b) => {
    const stat = stats.get(b.label)!;
    return {
      bucket: b.label,
      accuracy: Math.round((stat.correct / stat.total) * 100),
      reviews: stat.total,
    };
  });
}
