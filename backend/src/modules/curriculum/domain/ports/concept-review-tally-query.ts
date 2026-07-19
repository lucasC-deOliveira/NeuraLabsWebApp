import type { ConceptReviewTally } from '../services/concept-error-ranking';

// Read port: acertos e erros por CONCEITO, somados do histórico de revisões.
//
// Não existe tabela agregada por trás disto de propósito: `DesempenhoNo` existe no
// schema mas está vazia, e manter um agregado em sincronia com cada revisão é
// estado duplicado que pode divergir. O histórico (`revisoes_flashcard`) já é a
// fonte de verdade e tem volume pequeno o bastante para somar na hora.
export interface ConceptReviewTallyQuery {
  tallyByConcept(userId: string): Promise<ConceptReviewTally[]>;
}

export const CONCEPT_REVIEW_TALLY_QUERY = Symbol('CONCEPT_REVIEW_TALLY_QUERY');
