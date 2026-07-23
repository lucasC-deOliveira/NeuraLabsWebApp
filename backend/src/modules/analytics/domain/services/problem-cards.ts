import type { ProblemCardRow } from '../ports/flashcard-analytics-source';
import type { ProblemCard } from '../analytics-views';

// Cartões-problema (leeches): os que você mais erra. Ranqueia por nº de erros
// (desempate: menor acurácia primeiro) e devolve os `limit` piores, com acurácia.
export function rankProblemCards(rows: ProblemCardRow[], limit = 8): ProblemCard[] {
  return rows
    .map((row) => ({
      pergunta: row.pergunta,
      total: row.total,
      wrong: row.wrong,
      accuracy: Math.round(((row.total - row.wrong) / row.total) * 100),
    }))
    .sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy)
    .slice(0, limit);
}
