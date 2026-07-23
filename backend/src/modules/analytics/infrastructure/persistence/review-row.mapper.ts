import type { ReviewRow } from '../../domain/ports/flashcard-analytics-source';

// Select comum das revisões: campos crus da revisão + a data (vem da sessão, pois
// a revisão não tem timestamp próprio). Compartilhado pelas sources de analytics.
export const REVIEW_SELECT = {
  acertou: true,
  nivelConfianca: true,
  tempoResposta: true,
  tipoErro: true,
  sessao: { select: { dataInicio: true } },
} as const;

export interface RawReview {
  acertou: boolean;
  nivelConfianca: number;
  tempoResposta: number | null;
  tipoErro: string | null;
  sessao: { dataInicio: Date };
}

export function toReviewRow(row: RawReview): ReviewRow {
  return {
    data: row.sessao.dataInicio,
    acertou: row.acertou,
    nivelConfianca: row.nivelConfianca,
    tempoResposta: row.tempoResposta,
    tipoErro: row.tipoErro,
  };
}
