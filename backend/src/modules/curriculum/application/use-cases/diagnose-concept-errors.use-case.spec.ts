import { describe, it, expect } from 'vitest';
import { DiagnoseConceptErrorsUseCase } from './diagnose-concept-errors.use-case';
import type { ConceptReviewTallyQuery } from '../../domain/ports/concept-review-tally-query';
import type { ConceptReviewTally } from '../../domain/services/concept-error-ranking';

class FakeConceptReviewTallyQuery implements ConceptReviewTallyQuery {
  constructor(private readonly rows: ConceptReviewTally[]) {}
  tallyByConcept(): Promise<ConceptReviewTally[]> {
    return Promise.resolve(this.rows);
  }
}

const tally = (conceitoId: string, revisoes: number, erros: number): ConceptReviewTally => ({
  conceitoId,
  nome: `nome-${conceitoId}`,
  revisoes,
  erros,
});

describe('DiagnoseConceptErrorsUseCase', () => {
  it('returns the problem concepts, worst first', async () => {
    const useCase = new DiagnoseConceptErrorsUseCase(
      new FakeConceptReviewTallyQuery([tally('ok', 10, 1), tally('ruim', 10, 8)]),
    );

    const { conceitos } = await useCase.execute('u1');

    expect(conceitos[0].conceitoId).toBe('ruim');
  });

  it('caps the list so the screen stays actionable', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => tally(`c${i}`, 10, 5));

    const { conceitos } = await new DiagnoseConceptErrorsUseCase(
      new FakeConceptReviewTallyQuery(rows),
    ).execute('u1');

    expect(conceitos).toHaveLength(15);
  });

  // Sem isto a tela vazia é ambígua: "você acerta tudo" e "você ainda não estudou"
  // parecem a mesma coisa.
  it('reports how many reviews it looked at, so an empty result can be explained', async () => {
    const useCase = new DiagnoseConceptErrorsUseCase(
      new FakeConceptReviewTallyQuery([tally('c1', 4, 0), tally('c2', 6, 0)]),
    );

    const diagnosis = await useCase.execute('u1');

    expect(diagnosis.conceitos).toEqual([]);
    expect(diagnosis.revisoesAnalisadas).toBe(10);
  });
});
