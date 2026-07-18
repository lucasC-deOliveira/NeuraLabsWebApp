import { describe, expect, it } from 'vitest';
import { normalizeClassificationPlan, toClassificationPlan } from './classification-plan';

describe('toClassificationPlan', () => {
  it('translates chunk-local indices into flashcard ids', () => {
    const plan = toClassificationPlan(
      {
        assuntos: [{ nome: 'Algoritmos', descricao: '' }],
        topicos: [{ nome: 'Grafos', assunto: 'Algoritmos', descricao: '' }],
        conceitos: [{ nome: 'Dijkstra', topico: 'Grafos', descricao: '', indices: [0, 2] }],
      },
      ['fc-a', 'fc-b', 'fc-c'],
    );
    expect(plan.conceitos[0].flashcardIds).toEqual(['fc-a', 'fc-c']);
    expect(plan.assuntos).toHaveLength(1);
  });

  it('drops out-of-range indices instead of producing undefined ids', () => {
    const plan = toClassificationPlan(
      {
        assuntos: [],
        topicos: [],
        conceitos: [{ nome: 'X', topico: 'T', descricao: '', indices: [-1, 1, 99] }],
      },
      ['fc-a', 'fc-b'],
    );
    expect(plan.conceitos[0].flashcardIds).toEqual(['fc-b']);
  });
});

describe('normalizeClassificationPlan', () => {
  it('keeps only string flashcard ids from the untrusted payload', () => {
    const plan = normalizeClassificationPlan({
      conceitos: [{ nome: 'X', topico: 'T', descricao: '', flashcardIds: ['fc-a', 7, null] }],
    });
    expect(plan.conceitos[0].flashcardIds).toEqual(['fc-a']);
  });

  it('returns empty collections for a malformed payload', () => {
    const plan = normalizeClassificationPlan({ assuntos: 'nope', conceitos: 'nope' });
    expect(plan).toEqual({ assuntos: [], topicos: [], conceitos: [] });
  });
});
