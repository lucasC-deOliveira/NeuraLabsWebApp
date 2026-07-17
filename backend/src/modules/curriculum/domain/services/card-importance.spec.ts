import { describe, it, expect } from 'vitest';
import { cardImportanceByOwner } from './card-importance';
import type { NodeEdgePair } from './connected-concepts';

const pair = (ownerNode: string, other: string): NodeEdgePair => ({ ownerNode, other });

describe('cardImportanceByOwner', () => {
  const donos = new Map([
    ['n1', 'fc-1'],
    ['n2', 'fc-2'],
  ]);
  const conceitos = new Map([
    ['c1', 'g1:dijkstra'],
    ['c2', 'g1:recursao'],
  ]);
  const importancia = new Map([
    ['g1:dijkstra', 0.9],
    ['g1:recursao', 0.1],
  ]);

  it('gives each card the importance of its concept', () => {
    const out = cardImportanceByOwner(
      [pair('n1', 'c1'), pair('n2', 'c2')],
      donos,
      conceitos,
      importancia,
    );
    expect(out.get('fc-1')).toBe(0.9);
    expect(out.get('fc-2')).toBe(0.1);
  });

  // Um card pode tocar vários conceitos: vale o mais importante — é o que decide
  // se ele merece vir antes na sessão.
  it('takes the most important concept when the card touches several', () => {
    const out = cardImportanceByOwner(
      [pair('n1', 'c2'), pair('n1', 'c1')],
      donos,
      conceitos,
      importancia,
    );
    expect(out.get('fc-1')).toBe(0.9);
  });

  it('leaves out a card with no concept, instead of calling it zero', () => {
    const out = cardImportanceByOwner([pair('n2', 'c2')], donos, conceitos, importancia);
    expect(out.has('fc-1')).toBe(false);
  });

  it('ignores an edge to something that is not a concept', () => {
    const out = cardImportanceByOwner([pair('n1', 'nota-9')], donos, conceitos, importancia);
    expect(out.size).toBe(0);
  });

  it('ignores a concept with no importance computed', () => {
    const orfao = new Map([['c3', 'g1:sem-ranking']]);
    const out = cardImportanceByOwner([pair('n1', 'c3')], donos, orfao, importancia);
    expect(out.size).toBe(0);
  });

  // O conceito é UM só, em qualquer grafo: a escala é global por usuário. Antes a
  // chave levava o grafo (`g1:dijkstra`), porque o nó pertencia a um grafo e a
  // importância era normalizada dentro dele — com o nó do sistema isso caiu.
  it('gives the same weight to a concept no matter which graph shows it', () => {
    const mesmoConceito = new Map([
      ['c1', 'dijkstra'],
      ['c9', 'dijkstra'],
    ]);
    const pesos = new Map([['dijkstra', 0.9]]);
    const out = cardImportanceByOwner(
      [pair('n1', 'c1'), pair('n2', 'c9')],
      donos,
      mesmoConceito,
      pesos,
    );
    expect(out.get('fc-1')).toBe(0.9);
    expect(out.get('fc-2')).toBe(0.9);
  });

  it('has nothing to say about an empty graph', () => {
    expect(cardImportanceByOwner([], donos, conceitos, importancia).size).toBe(0);
  });
});
