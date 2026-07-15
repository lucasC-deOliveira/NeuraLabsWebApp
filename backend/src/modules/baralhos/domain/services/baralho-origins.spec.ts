import { describe, it, expect } from 'vitest';
import { groupBaralhoOrigins } from './baralho-origins';

const names = new Map([
  ['g1', 'Biologia'],
  ['g2', 'Química'],
]);

describe('groupBaralhoOrigins', () => {
  it('groups every graph a deck has a node in', () => {
    const nodes = [
      { referenciaId: 'b1', grafoId: 'g1' },
      { referenciaId: 'b1', grafoId: 'g2' },
      { referenciaId: 'b2', grafoId: 'g1' },
    ];
    const result = groupBaralhoOrigins(nodes, names);
    expect(result.get('b1')).toEqual([
      { grafoId: 'g1', nome: 'Biologia' },
      { grafoId: 'g2', nome: 'Química' },
    ]);
    expect(result.get('b2')).toEqual([{ grafoId: 'g1', nome: 'Biologia' }]);
  });

  it('drops nodes without a graph', () => {
    expect(groupBaralhoOrigins([{ referenciaId: 'b1', grafoId: null }], names).size).toBe(0);
  });

  it('drops nodes whose graph is unknown, to never link somewhere broken', () => {
    expect(groupBaralhoOrigins([{ referenciaId: 'b1', grafoId: 'gone' }], names).size).toBe(0);
  });

  it('returns nothing for an empty node list', () => {
    expect(groupBaralhoOrigins([], names).size).toBe(0);
  });
});
