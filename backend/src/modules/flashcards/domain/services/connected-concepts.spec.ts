import { describe, it, expect } from 'vitest';
import { flashcardEdgePairs, conceptTagsByFlashcard, type EdgeEnds } from './connected-concepts';
import type { ConceptTag } from '../flashcard-views';

describe('flashcardEdgePairs', () => {
  const fcNodes = new Set(['fc1']);

  it('extracts the other end regardless of edge direction', () => {
    const edges: EdgeEnds[] = [
      { nodeOrigemId: 'fc1', nodeDestinoId: 'c1' }, // flashcard → conceito
      { nodeOrigemId: 'c2', nodeDestinoId: 'fc1' }, // conceito → flashcard
    ];
    expect(flashcardEdgePairs(edges, fcNodes)).toEqual([
      { fcNode: 'fc1', other: 'c1' },
      { fcNode: 'fc1', other: 'c2' },
    ]);
  });

  it('ignores edges without both ends or unrelated to a flashcard node', () => {
    const edges: EdgeEnds[] = [
      { nodeOrigemId: 'fc1', nodeDestinoId: null }, // sem o outro lado
      { nodeOrigemId: 'x', nodeDestinoId: 'y' }, // não é flashcard
    ];
    expect(flashcardEdgePairs(edges, fcNodes)).toEqual([]);
  });
});

describe('conceptTagsByFlashcard', () => {
  const tag = (conceito: string, topico: string, assunto: string): ConceptTag => ({
    conceito,
    topico,
    topicoId: `id-${topico}`,
    assunto,
    assuntoId: `id-${assunto}`,
  });

  it('groups distinct connected concepts per flashcard, sorted by name', () => {
    const pairs = [
      { fcNode: 'nFc', other: 'nZeta' },
      { fcNode: 'nFc', other: 'nAlpha' },
      { fcNode: 'nFc', other: 'nAlpha' }, // duplicado
    ];
    const nodeToFlashcard = new Map([['nFc', 'fc1']]);
    const conceptNodeToId = new Map([
      ['nZeta', 'cZeta'],
      ['nAlpha', 'cAlpha'],
    ]);
    const tagByConcept = new Map([
      ['cZeta', tag('Zeta', 'T2', 'Bio')],
      ['cAlpha', tag('Alpha', 'T1', 'Bio')],
    ]);

    const result = conceptTagsByFlashcard(pairs, nodeToFlashcard, conceptNodeToId, tagByConcept);
    expect(result.get('fc1')?.map((t) => t.conceito)).toEqual(['Alpha', 'Zeta']);
  });

  it('drops ends that are not concept nodes', () => {
    const pairs = [{ fcNode: 'nFc', other: 'nNota' }];
    const result = conceptTagsByFlashcard(
      pairs,
      new Map([['nFc', 'fc1']]),
      new Map(), // nNota não está no mapa de conceitos
      new Map(),
    );
    expect(result.size).toBe(0);
  });
});
