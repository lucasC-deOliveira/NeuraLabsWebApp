// Onde o usuário mais erra, por CONCEITO — não por card. Errar 6 cards de "Binary
// Search" é um buraco de entendimento; errar 6 cards espalhados é só o dia ruim.
// Domínio puro, 0 token: sai do histórico de revisões que já existe.

export interface ConceptReviewTally {
  conceitoId: string;
  nome: string;
  revisoes: number;
  erros: number;
  // Os cards errados NESTE conceito. É o que a tela usa para abrir uma sessão
  // focada — diagnosticar sem oferecer a ação deixa o trabalho pela metade.
  cardsComErro: string[];
}

export interface ConceptErrorRank extends ConceptReviewTally {
  taxaErro: number;
  // Limite inferior do intervalo de confiança da taxa de erro. É por ele que a
  // lista é ordenada — ver `wilsonLowerBound`.
  score: number;
}

// Abaixo disto não há amostra para afirmar nada sobre o conceito.
export const MIN_REVIEWS = 3;

// 95% de confiança (z = 1.96).
const Z = 1.96;

/**
 * Conceitos onde o usuário mais erra, do mais problemático para o menos.
 * @example rankConceptErrors([{ conceitoId: 'c1', nome: 'Grafos', revisoes: 8, erros: 6 }])
 */
export function rankConceptErrors(tallies: ConceptReviewTally[]): ConceptErrorRank[] {
  return tallies
    .filter((t) => t.revisoes >= MIN_REVIEWS && t.erros > 0)
    .map(toRank)
    .sort((a, b) => b.score - a.score);
}

function toRank(tally: ConceptReviewTally): ConceptErrorRank {
  return {
    ...tally,
    taxaErro: tally.erros / tally.revisoes,
    score: wilsonLowerBound(tally.erros, tally.revisoes),
  };
}

/**
 * Limite inferior de Wilson para a proporção de erros.
 *
 * Ordenar pela taxa crua colocaria "1 erro em 1 revisão" (100%) acima de "16 erros
 * em 20" (80%) — e o primeiro não é evidência de nada. Wilson penaliza a amostra
 * pequena automaticamente, sem precisar de um corte arbitrário no meio da lista.
 */
function wilsonLowerBound(errors: number, total: number): number {
  const p = errors / total;
  const z2 = Z * Z;
  const denominator = 1 + z2 / total;
  const centre = p + z2 / (2 * total);
  const margin = Z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  return (centre - margin) / denominator;
}
