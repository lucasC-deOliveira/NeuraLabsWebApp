import { describe, it, expect } from 'vitest';
import { parseFeynmanFeedback } from './feynman-feedback';

const candidatos = [
  { id: 'c1', nome: 'Heap' },
  { id: 'c2', nome: 'Complexidade' },
];

describe('parseFeynmanFeedback', () => {
  it('clamps clareza and maps gaps to concept ids by name', () => {
    const raw = {
      clareza: 142,
      jargao: ['árvore binária completa', '', 42],
      lacunas: [
        { ponto: 'não citou prioridade', conceito: 'Heap' },
        { ponto: 'não citou custo', conceito: 'complexidade' }, // case-insensitive
        { ponto: 'algo', conceito: 'Inexistente' },
      ],
      analogia: 'como uma fila do hospital',
      reescrita: 'É uma forma de guardar coisas...',
    };
    const fb = parseFeynmanFeedback(raw, candidatos);
    expect(fb.clareza).toBe(100);
    expect(fb.jargao).toEqual(['árvore binária completa']);
    expect(fb.lacunas).toEqual([
      { ponto: 'não citou prioridade', conceitoId: 'c1' },
      { ponto: 'não citou custo', conceitoId: 'c2' },
      { ponto: 'algo', conceitoId: null },
    ]);
    expect(fb.analogia).toContain('fila');
  });

  it('is safe with garbage/missing fields', () => {
    const fb = parseFeynmanFeedback({ clareza: 'x', lacunas: 'nope' }, candidatos);
    expect(fb).toEqual({ clareza: 0, jargao: [], lacunas: [], analogia: '', reescrita: '' });
  });
});
