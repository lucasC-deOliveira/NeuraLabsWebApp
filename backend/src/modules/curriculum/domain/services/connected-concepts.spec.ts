import { describe, it, expect } from 'vitest';
import { nodeEdgePairs, conceptTagsByOwner, type EdgeEnds } from './connected-concepts';
import type { ConceptTag } from '../curriculum-views';

describe('nodeEdgePairs', () => {
  const ownerNodes = new Set(['fc1']);

  it('extracts the other end regardless of edge direction', () => {
    const edges: EdgeEnds[] = [
      { nodeOrigemId: 'fc1', nodeDestinoId: 'c1' }, // flashcard → conceito
      { nodeOrigemId: 'c2', nodeDestinoId: 'fc1' }, // conceito → flashcard
    ];
    expect(nodeEdgePairs(edges, ownerNodes)).toEqual([
      { ownerNode: 'fc1', other: 'c1' },
      { ownerNode: 'fc1', other: 'c2' },
    ]);
  });

  it('ignores edges without both ends or unrelated to a flashcard node', () => {
    const edges: EdgeEnds[] = [
      { nodeOrigemId: 'fc1', nodeDestinoId: null }, // sem o outro lado
      { nodeOrigemId: 'x', nodeDestinoId: 'y' }, // não é flashcard
    ];
    expect(nodeEdgePairs(edges, ownerNodes)).toEqual([]);
  });
});

describe('conceptTagsByOwner', () => {
  const tag = (conceito: string, topico: string, assunto: string): ConceptTag => ({
    conceito,
    topico,
    topicoId: `id-${topico}`,
    assunto,
    assuntoId: `id-${assunto}`,
  });

  it('groups distinct connected concepts per flashcard, sorted by name', () => {
    const pairs = [
      { ownerNode: 'nFc', other: 'nZeta' },
      { ownerNode: 'nFc', other: 'nAlpha' },
      { ownerNode: 'nFc', other: 'nAlpha' }, // duplicado
    ];
    const nodeToOwner = new Map([['nFc', 'fc1']]);
    const conceptNodeToId = new Map([
      ['nZeta', 'cZeta'],
      ['nAlpha', 'cAlpha'],
    ]);
    const tagByConcept = new Map([
      ['cZeta', tag('Zeta', 'T2', 'Bio')],
      ['cAlpha', tag('Alpha', 'T1', 'Bio')],
    ]);

    const result = conceptTagsByOwner(pairs, nodeToOwner, conceptNodeToId, tagByConcept);
    expect(result.get('fc1')?.map((t) => t.conceito)).toEqual(['Alpha', 'Zeta']);
  });

  it('drops ends that are not concept nodes', () => {
    const pairs = [{ ownerNode: 'nFc', other: 'nNota' }];
    const result = conceptTagsByOwner(
      pairs,
      new Map([['nFc', 'fc1']]),
      new Map(), // nNota não está no mapa de conceitos
      new Map(),
    );
    expect(result.size).toBe(0);
  });
});
