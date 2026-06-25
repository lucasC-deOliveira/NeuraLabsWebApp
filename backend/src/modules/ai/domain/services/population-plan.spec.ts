import { describe, it, expect } from 'vitest';
import { normalizePopulationPlan } from './population-plan';

describe('normalizePopulationPlan', () => {
  it('trims strings and keeps only numeric indices', () => {
    const plan = normalizePopulationPlan({
      assuntos: [{ nome: ' Bio ' }],
      topicos: [{ nome: 'Cel', assunto: 'Bio' }],
      conceitos: [{ nome: 'Mitose', topico: 'Cel', indices: [0, '1', 2] }],
    });
    expect(plan.assuntos).toEqual([{ nome: 'Bio', descricao: '' }]);
    expect(plan.topicos).toEqual([{ nome: 'Cel', assunto: 'Bio', descricao: '' }]);
    expect(plan.conceitos).toEqual([
      { nome: 'Mitose', topico: 'Cel', descricao: '', indices: [0, 2] },
    ]);
  });

  it('tolerates non-array fields', () => {
    expect(normalizePopulationPlan({})).toEqual({ assuntos: [], topicos: [], conceitos: [] });
  });
});
