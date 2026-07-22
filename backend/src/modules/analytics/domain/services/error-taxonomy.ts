import type { ReviewRow } from '../ports/flashcard-analytics-source';
import type { ErrorTypeCount } from '../analytics-views';

// Distribuição dos ERROS por tipo (tipoErro). Só conta revisões erradas com um
// tipo registrado; ordena do mais frequente para o menos. Sinal antes ignorado.
export function errorTaxonomy(reviews: ReviewRow[]): ErrorTypeCount[] {
  const byType = new Map<string, number>();
  for (const review of reviews) {
    if (review.acertou || !review.tipoErro) continue;
    byType.set(review.tipoErro, (byType.get(review.tipoErro) ?? 0) + 1);
  }
  return [...byType.entries()]
    .map(([tipo, count]) => ({ tipo, count }))
    .sort((a, b) => b.count - a.count);
}
