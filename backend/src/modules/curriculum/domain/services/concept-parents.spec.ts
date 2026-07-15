import { describe, it, expect } from 'vitest';
import { resolveParents, parentsByConceito, NO_PARENTS, type ParentMaps } from './concept-parents';

// nConceito → nTopico → nAssunto
function maps(over: Partial<ParentMaps> = {}): ParentMaps {
  return {
    topicoNodeByConceptNode: new Map([['nConceito', 'nTopico']]),
    assuntoNodeByTopicoNode: new Map([['nTopico', 'nAssunto']]),
    topicoByNode: new Map([['nTopico', { id: 't1', nome: 'Cache' }]]),
    assuntoByNode: new Map([['nAssunto', { id: 'a1', nome: 'Computação' }]]),
    ...over,
  };
}

describe('resolveParents', () => {
  it('climbs concept → topic → subject through the graph', () => {
    expect(resolveParents('nConceito', maps())).toEqual({
      topico: 'Cache',
      topicoId: 't1',
      assunto: 'Computação',
      assuntoId: 'a1',
    });
  });

  it('gives no parents to a concept with no topic edge', () => {
    expect(resolveParents('solto', maps())).toEqual(NO_PARENTS);
  });

  it('gives the topic even when it has no subject above it', () => {
    const result = resolveParents('nConceito', maps({ assuntoNodeByTopicoNode: new Map() }));
    expect(result).toEqual({ topico: 'Cache', topicoId: 't1', assunto: '', assuntoId: '' });
  });

  it('gives no parents when the topic node has no entity behind it', () => {
    expect(resolveParents('nConceito', maps({ topicoByNode: new Map() }))).toEqual(NO_PARENTS);
  });

  it('leaves the subject empty when its node has no entity behind it', () => {
    const result = resolveParents('nConceito', maps({ assuntoByNode: new Map() }));
    expect(result).toMatchObject({ topicoId: 't1', assuntoId: '' });
  });
});

describe('parentsByConceito', () => {
  it('maps each concept to its parents', () => {
    const result = parentsByConceito(new Map([['nConceito', 'c1']]), maps());
    expect(result.get('c1')).toMatchObject({ topicoId: 't1', assuntoId: 'a1' });
  });

  it('keeps the parents found in one graph when another graph has the concept loose', () => {
    // O mesmo conceito c1 tem nó em dois grafos: um com hierarquia, outro sem.
    const conceptNodeToId = new Map([
      ['solto', 'c1'],
      ['nConceito', 'c1'],
    ]);
    expect(parentsByConceito(conceptNodeToId, maps()).get('c1')).toMatchObject({ topicoId: 't1' });
  });

  it('reports a concept with no parents anywhere as parentless', () => {
    expect(parentsByConceito(new Map([['solto', 'c1']]), maps()).get('c1')).toEqual(NO_PARENTS);
  });

  it('maps nothing for no concepts', () => {
    expect(parentsByConceito(new Map(), maps()).size).toBe(0);
  });
});
