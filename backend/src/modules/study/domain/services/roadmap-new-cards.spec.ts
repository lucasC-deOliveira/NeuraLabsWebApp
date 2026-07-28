import { describe, it, expect } from 'vitest';
import {
  pickNewCards,
  groupNewByConcept,
  type ConceptNewCards,
  type ConceptLink,
} from './roadmap-new-cards';

const ordered: ConceptNewCards[] = [
  { conceitoId: 'c1', cardIds: ['a', 'b'] },
  { conceitoId: 'c2', cardIds: ['c'] },
  { conceitoId: 'c3', cardIds: ['d', 'e'] },
];

describe('pickNewCards', () => {
  it('pulls cards concept by concept in roadmap order', () => {
    expect(pickNewCards(ordered, 4)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('stops exactly at the limit, mid-concept', () => {
    expect(pickNewCards(ordered, 1)).toEqual(['a']);
  });

  it('returns everything when the limit exceeds the pool', () => {
    expect(pickNewCards(ordered, 99)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('returns nothing for a zero limit', () => {
    expect(pickNewCards(ordered, 0)).toEqual([]);
  });
});

describe('groupNewByConcept', () => {
  const conceptNodeToId = new Map([
    ['n1', 'c1'],
    ['n2', 'c2'],
  ]);
  const links: ConceptLink[] = [
    { conceptNodeId: 'n1', flashcardId: 'a' },
    { conceptNodeId: 'n1', flashcardId: 'b' },
    { conceptNodeId: 'n2', flashcardId: 'c' },
  ];

  it('groups new cards by concept following the roadmap order', () => {
    const out = groupNewByConcept(['c2', 'c1'], conceptNodeToId, links, new Set(['a', 'b', 'c']));
    expect(out).toEqual([
      { conceitoId: 'c2', cardIds: ['c'] },
      { conceitoId: 'c1', cardIds: ['a', 'b'] },
    ]);
  });

  it('drops cards that are not new and concepts left empty', () => {
    const out = groupNewByConcept(['c1', 'c2'], conceptNodeToId, links, new Set(['a']));
    expect(out).toEqual([{ conceitoId: 'c1', cardIds: ['a'] }]); // b não é novo; c2 vazio some
  });

  it('does not duplicate a card linked twice to the same concept', () => {
    const dup: ConceptLink[] = [
      { conceptNodeId: 'n1', flashcardId: 'a' },
      { conceptNodeId: 'n1', flashcardId: 'a' },
    ];
    const out = groupNewByConcept(['c1'], conceptNodeToId, dup, new Set(['a']));
    expect(out).toEqual([{ conceitoId: 'c1', cardIds: ['a'] }]);
  });
});
