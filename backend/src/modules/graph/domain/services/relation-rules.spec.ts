import { describe, it, expect } from 'vitest';
import {
  getAllowedRelations,
  isRelationAllowed,
  getCanonicalDirection,
  getInsightTargets,
} from './relation-rules';

describe('getAllowedRelations', () => {
  it('returns the relations for a known pair regardless of argument order', () => {
    expect(getAllowedRelations('TEXTO_BRUTO', 'NOTA')).toEqual(['GERA']);
    expect(getAllowedRelations('NOTA', 'TEXTO_BRUTO')).toEqual(['GERA']);
  });

  it('returns an empty list for an unknown pair', () => {
    expect(getAllowedRelations('ASSUNTO', 'FLASHCARD')).toEqual([]);
  });
});

describe('isRelationAllowed', () => {
  it('is true for an allowed relation on the pair', () => {
    expect(isRelationAllowed('NOTA', 'CONCEITO', 'DEFINE')).toBe(true);
  });
  it('is false for a relation not allowed on the pair', () => {
    expect(isRelationAllowed('NOTA', 'CONCEITO', 'CONTEM')).toBe(false);
  });
});

describe('getCanonicalDirection', () => {
  it('returns the canonical [source, target] for the relation', () => {
    expect(getCanonicalDirection('NOTA', 'TEXTO_BRUTO', 'GERA')).toEqual(['TEXTO_BRUTO', 'NOTA']);
  });

  it('is stable whichever order the types are passed', () => {
    expect(getCanonicalDirection('TEXTO_BRUTO', 'NOTA', 'GERA')).toEqual(['TEXTO_BRUTO', 'NOTA']);
  });

  it('returns null when the relation does not exist for the types', () => {
    expect(getCanonicalDirection('NOTA', 'CONCEITO', 'GERA')).toBeNull();
    expect(getCanonicalDirection('NOTA', 'CONCEITO', 'INEXISTENTE')).toBeNull();
  });
});

describe('getInsightTargets', () => {
  it('lists the insight target types (ASSUNTO/TOPICO/CONCEITO) reachable from a source', () => {
    const targets = getInsightTargets('NOTA');
    const tipos = targets.map((t) => t.tipo);
    expect(tipos).toContain('CONCEITO');
    expect(tipos).toContain('TOPICO');
    expect(tipos).toContain('ASSUNTO');
    expect(targets.find((t) => t.tipo === 'CONCEITO')?.relacoes).toContain('DEFINE');
  });

  it('omits target types with no allowed relation', () => {
    // TEXTO_BRUTO only relates to NOTA, none of the insight target types.
    expect(getInsightTargets('TEXTO_BRUTO')).toEqual([]);
  });
});

describe('question relations', () => {
  it('lets an exam contain questions and a question test a concept', () => {
    expect(isRelationAllowed('PROVA', 'QUESTION', 'CONTEM')).toBe(true);
    expect(isRelationAllowed('QUESTION', 'CONCEITO', 'TESTA')).toBe(true);
    expect(isRelationAllowed('QUESTION', 'CONCEITO', 'HERDA')).toBe(true);
  });

  it('lets a question hang off a topic when no atomic concept fits', () => {
    expect(isRelationAllowed('QUESTION', 'TOPICO', 'PERTENCE_A')).toBe(true);
  });

  it('still rejects a relation that is not on the pair', () => {
    expect(isRelationAllowed('PROVA', 'QUESTION', 'TESTA')).toBe(false);
    expect(isRelationAllowed('QUESTION', 'TOPICO', 'CONTEM')).toBe(false);
  });
});
