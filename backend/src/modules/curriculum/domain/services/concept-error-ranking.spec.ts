import { describe, it, expect } from 'vitest';
import { rankConceptErrors, type ConceptReviewTally } from './concept-error-ranking';

const tally = (conceitoId: string, revisoes: number, erros: number): ConceptReviewTally => ({
  conceitoId,
  nome: `nome-${conceitoId}`,
  revisoes,
  erros,
  cardsComErro: Array.from({ length: erros }, (_, i) => `${conceitoId}-card${i}`),
});

describe('rankConceptErrors', () => {
  it('ranks the concept you get wrong most often first', () => {
    const ranked = rankConceptErrors([tally('bom', 10, 1), tally('ruim', 10, 9)]);

    expect(ranked.map((r) => r.conceitoId)).toEqual(['ruim', 'bom']);
    expect(ranked[0].taxaErro).toBeCloseTo(0.9);
  });

  // 1 erro em 1 revisão é 100% de erro e não significa nada. Sem isso o topo do
  // ranking vira ruído e a tela perde a utilidade justamente para quem estuda pouco.
  it('does not let a single unlucky review outrank a real problem', () => {
    const ranked = rankConceptErrors([tally('azarado', 1, 1), tally('problema', 20, 16)]);

    expect(ranked[0].conceitoId).toBe('problema');
  });

  it('drops concepts with too few reviews to say anything', () => {
    const ranked = rankConceptErrors([tally('novo', 1, 0), tally('estudado', 10, 5)]);

    expect(ranked.map((r) => r.conceitoId)).toEqual(['estudado']);
  });

  it('ignores concepts you never get wrong', () => {
    expect(rankConceptErrors([tally('dominado', 10, 0)])).toEqual([]);
  });

  it('reports the counts so the UI can show evidence, not just a score', () => {
    const [top] = rankConceptErrors([tally('c1', 8, 6)]);

    expect(top).toMatchObject({ nome: 'nome-c1', revisoes: 8, erros: 6 });
    expect(top.taxaErro).toBeCloseTo(0.75);
  });

  it('returns nothing for an empty history instead of failing', () => {
    expect(rankConceptErrors([])).toEqual([]);
  });

  // O diagnóstico existe para levar a uma sessão focada; sem os ids o botão
  // "estudar os que errei" não tem o que abrir.
  it('carries the errored card ids through to the ranking', () => {
    const [top] = rankConceptErrors([tally('c1', 8, 2)]);

    expect(top.cardsComErro).toEqual(['c1-card0', 'c1-card1']);
  });
});
