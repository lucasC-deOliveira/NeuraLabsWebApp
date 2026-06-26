import { describe, it, expect } from 'vitest';
import { normalizeCurriculumPlan, buildCurriculumContext } from './curriculum-plan';

describe('normalizeCurriculumPlan', () => {
  it('applies defaults and keeps only string children', () => {
    const plan = normalizeCurriculumPlan({
      assuntos: [{ nome: 'Bio', topicos: ['Célula', 7] }],
      topicos: [{ conceitos: ['Mitose'] }],
      conceitos: [{ nome: 'X' }, {}],
    });
    expect(plan.assuntos).toEqual([{ nome: 'Bio', topicos: ['Célula'] }]);
    expect(plan.topicos).toEqual([{ nome: 'Tópico', conceitos: ['Mitose'] }]);
    expect(plan.conceitos).toEqual(['X', 'Conceito']);
  });

  it('tolerates non-array fields', () => {
    expect(normalizeCurriculumPlan({})).toEqual({ assuntos: [], topicos: [], conceitos: [] });
  });
});

describe('buildCurriculumContext', () => {
  it('lists only the non-empty groups', () => {
    const ctx = buildCurriculumContext({
      assuntos: [{ id: 'a', nome: 'Bio' }],
      topicos: [],
      conceitos: [{ id: 'c', nome: 'Mitose' }],
    });
    expect(ctx).toBe('ASSUNTOS: Bio\nCONCEITOS: Mitose');
  });
});
