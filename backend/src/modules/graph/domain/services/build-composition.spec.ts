import { describe, it, expect } from 'vitest';
import { buildComposition } from './build-composition';
import type { CompositionInput, LeafInput } from '../ports/composition-source';

function leaf(id: string, label: string, conceitoId: string): LeafInput {
  return {
    id,
    type: 'FLASHCARD',
    label,
    conceito: {
      id: conceitoId,
      nome: `Conceito ${conceitoId}`,
      topico: { id: 't1', nome: 'Árvores', assunto: { id: 'a1', nome: 'Estruturas' } },
    },
  };
}

describe('buildComposition', () => {
  it('builds a flashcard chain: leaf HERDA conceito PERTENCE_A tópico PERTENCE_A assunto', () => {
    const input: CompositionInput = {
      root: { id: 'f1', type: 'FLASHCARD', label: 'O que é heap?' },
      rootIsLeaf: true,
      leaves: [leaf('f1', 'O que é heap?', 'c1')],
    };
    const g = buildComposition(input);
    expect(g.nodes.map((n) => `${n.type}:${n.id}`)).toEqual([
      'FLASHCARD:f1',
      'CONCEITO:c1',
      'TOPICO:t1',
      'ASSUNTO:a1',
    ]);
    expect(g.edges).toEqual([
      { source: 'f1', target: 'c1', rel: 'HERDA' },
      { source: 'c1', target: 't1', rel: 'PERTENCE_A' },
      { source: 't1', target: 'a1', rel: 'PERTENCE_A' },
    ]);
  });

  it('composes a baralho: CONTEM each flashcard and dedups the shared hierarchy', () => {
    const input: CompositionInput = {
      root: { id: 'b1', type: 'BARALHO', label: 'Heap' },
      rootIsLeaf: false,
      leaves: [leaf('f1', 'card 1', 'c1'), leaf('f2', 'card 2', 'c1')], // mesmo conceito
    };
    const g = buildComposition(input);
    // baralho, 2 flashcards, 1 conceito, 1 tópico, 1 assunto (deduplicados)
    expect(g.nodes).toHaveLength(6);
    expect(g.edges.filter((e) => e.rel === 'CONTEM')).toEqual([
      { source: 'b1', target: 'f1', rel: 'CONTEM' },
      { source: 'b1', target: 'f2', rel: 'CONTEM' },
    ]);
    // conceito só aparece uma vez apesar de vir de dois flashcards
    expect(g.nodes.filter((n) => n.type === 'CONCEITO')).toHaveLength(1);
  });

  it('handles a leaf without a conceito (só o nó raiz)', () => {
    const input: CompositionInput = {
      root: { id: 'q1', type: 'QUESTION', label: 'Sem conceito' },
      rootIsLeaf: true,
      leaves: [{ id: 'q1', type: 'QUESTION', label: 'Sem conceito', conceito: null }],
    };
    const g = buildComposition(input);
    expect(g.nodes).toEqual([{ id: 'q1', type: 'QUESTION', label: 'Sem conceito' }]);
    expect(g.edges).toEqual([]);
  });
});
