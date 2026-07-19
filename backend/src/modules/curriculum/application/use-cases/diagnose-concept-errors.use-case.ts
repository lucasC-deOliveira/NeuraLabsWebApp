import {
  rankConceptErrors,
  type ConceptErrorRank,
} from '../../domain/services/concept-error-ranking';
import type { ConceptReviewTallyQuery } from '../../domain/ports/concept-review-tally-query';

// Uma tela de diagnóstico serve para escolher o que revisar hoje; uma lista longa
// não ajuda a escolher.
const MAX_CONCEPTS = 15;

export interface ConceptErrorDiagnosis {
  conceitos: ConceptErrorRank[];
  // Quantas revisões entraram na conta — a UI usa para dizer "ainda estude mais"
  // em vez de mostrar uma tela vazia sem explicação.
  revisoesAnalisadas: number;
}

/**
 * Diagnóstico de onde o usuário mais erra, por conceito. 0 token: sai do histórico
 * de revisões cruzado com as arestas DEFINE do grafo.
 * @example diagnoseConceptErrors.execute('u1')
 */
export class DiagnoseConceptErrorsUseCase {
  constructor(private readonly tallies: ConceptReviewTallyQuery) {}

  async execute(userId: string): Promise<ConceptErrorDiagnosis> {
    const tallies = await this.tallies.tallyByConcept(userId);
    const revisoesAnalisadas = tallies.reduce((sum, t) => sum + t.revisoes, 0);
    return { conceitos: rankConceptErrors(tallies).slice(0, MAX_CONCEPTS), revisoesAnalisadas };
  }
}
