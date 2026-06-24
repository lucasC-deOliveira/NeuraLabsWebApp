import { describe, it, expect } from 'vitest';
import {
  conceptIdsToDetach,
  selectDeletionCandidates,
  sortForDeletion,
  type GraphMember,
} from './graph-deletion-plan';

const m = (tipoNode: string, referenciaId: string): GraphMember => ({ tipoNode, referenciaId });

describe('selectDeletionCandidates', () => {
  it('always deletes structural types and never GRAFO_REF', () => {
    const members = [m('ASSUNTO', 'a'), m('CONCEITO', 'c'), m('GRAFO_REF', 'g')];
    expect(selectDeletionCandidates(members, [])).toEqual([m('ASSUNTO', 'a'), m('CONCEITO', 'c')]);
  });

  it('keeps reusable types listed in keepTypes', () => {
    const members = [m('FLASHCARD', 'f'), m('NOTA', 'n')];
    expect(selectDeletionCandidates(members, ['FLASHCARD'])).toEqual([m('NOTA', 'n')]);
  });

  it('ignores keep entries that are not reusable types', () => {
    const members = [m('CONCEITO', 'c')];
    expect(selectDeletionCandidates(members, ['CONCEITO'])).toEqual([m('CONCEITO', 'c')]);
  });
});

describe('sortForDeletion', () => {
  it('orders flashcards first, then misc, concepts, topics, subjects', () => {
    const members = [m('ASSUNTO', 'a'), m('FLASHCARD', 'f'), m('NOTA', 'n'), m('CONCEITO', 'c')];
    expect(sortForDeletion(members).map((x) => x.tipoNode)).toEqual([
      'FLASHCARD',
      'NOTA',
      'CONCEITO',
      'ASSUNTO',
    ]);
  });

  it('does not mutate the input array', () => {
    const members = [m('ASSUNTO', 'a'), m('FLASHCARD', 'f')];
    sortForDeletion(members);
    expect(members.map((x) => x.tipoNode)).toEqual(['ASSUNTO', 'FLASHCARD']);
  });
});

describe('conceptIdsToDetach', () => {
  it('returns deleted concept ids when flashcards are kept', () => {
    const toDelete = [m('CONCEITO', 'c1'), m('CONCEITO', 'c2'), m('TOPICO', 't')];
    expect(conceptIdsToDetach(toDelete, ['FLASHCARD'])).toEqual(['c1', 'c2']);
  });

  it('returns nothing when flashcards are not kept', () => {
    const toDelete = [m('CONCEITO', 'c1')];
    expect(conceptIdsToDetach(toDelete, [])).toEqual([]);
  });
});
