import { describe, it, expect } from 'vitest';
import { normalizeEditalPlan, editalPlanMessages } from './edital-plan';

describe('normalizeEditalPlan', () => {
  it('mirrors disciplina→assunto, tópico→tópico, subitem→conceito', () => {
    const plan = normalizeEditalPlan({
      assuntos: [
        {
          nome: 'Língua Portuguesa',
          topicos: [{ nome: 'Coesão textual', conceitos: ['Referenciação', 'Conectores'] }],
        },
      ],
    });
    expect(plan.assuntos[0].nome).toBe('Língua Portuguesa');
    expect(plan.assuntos[0].topicos[0].conceitos).toEqual(['Referenciação', 'Conectores']);
  });

  it('gives a leaf topic (no sub-items) a concept of its own name', () => {
    const plan = normalizeEditalPlan({
      assuntos: [{ nome: 'LP', topicos: [{ nome: 'Domínio da ortografia oficial' }] }],
    });
    expect(plan.assuntos[0].topicos[0].conceitos).toEqual(['Domínio da ortografia oficial']);
  });

  it('drops empty assuntos and dedupes concept names', () => {
    const plan = normalizeEditalPlan({
      assuntos: [
        { nome: '', topicos: [{ nome: 'x', conceitos: ['a'] }] },
        { nome: 'A', topicos: [{ nome: 't', conceitos: ['C', 'c', '  ', 'C'] }] },
      ],
    });
    expect(plan.assuntos).toHaveLength(1);
    expect(plan.assuntos[0].topicos[0].conceitos).toEqual(['C']);
  });

  it('accepts objects or strings as concepts', () => {
    const plan = normalizeEditalPlan({
      assuntos: [{ nome: 'A', topicos: [{ nome: 't', conceitos: [{ nome: 'Alpha' }, 'Beta'] }] }],
    });
    expect(plan.assuntos[0].topicos[0].conceitos).toEqual(['Alpha', 'Beta']);
  });
});

describe('editalPlanMessages', () => {
  it('carries the mapping rules and the existing-nodes context', () => {
    const [system, user] = editalPlanMessages(
      'LÍNGUA PORTUGUESA: 1 ...',
      '\n\nNÓS JÁ NO GRAFO: ...',
    );
    expect(system.content).toContain('DISCIPLINA');
    expect(system.content).toContain('NÓS JÁ NO GRAFO');
    expect(user.content).toContain('LÍNGUA PORTUGUESA');
  });
});
