import { describe, it, expect } from 'vitest';
import { normalizeGraphPlan } from './graph-plan';

describe('normalizeGraphPlan', () => {
  it('defaults the subject and keeps the deck name', () => {
    const plan = normalizeGraphPlan({ baralho: ' Estudo ' });
    expect(plan.assunto).toEqual({ nome: 'Assunto', descricao: '' });
    expect(plan.baralho).toBe('Estudo');
    expect(plan.topicos).toEqual([]);
  });

  it('builds the nested tree, dropping nameless/incomplete children', () => {
    const plan = normalizeGraphPlan({
      assunto: { nome: 'Bio' },
      topicos: [
        {
          nome: 'Cel',
          conceitos: [
            {
              nome: 'Mitose',
              nota: { titulo: 'N', conteudo: 'c' },
              flashcards: [{ pergunta: 'p', resposta: 'r' }, { pergunta: 'x' }],
            },
            { nome: '' },
          ],
        },
        { nome: '' },
      ],
    });
    expect(plan.topicos).toHaveLength(1);
    const conceito = plan.topicos[0]?.conceitos[0];
    expect(conceito?.nome).toBe('Mitose');
    expect(conceito?.nota).toEqual({ titulo: 'N', conteudo: 'c' });
    expect(conceito?.flashcards).toEqual([{ pergunta: 'p', resposta: 'r' }]);
  });

  it('returns a null note when the title is missing', () => {
    const plan = normalizeGraphPlan({
      topicos: [{ nome: 'T', conceitos: [{ nome: 'C', nota: { conteudo: 'x' } }] }],
    });
    expect(plan.topicos[0]?.conceitos[0]?.nota).toBeNull();
  });
});
