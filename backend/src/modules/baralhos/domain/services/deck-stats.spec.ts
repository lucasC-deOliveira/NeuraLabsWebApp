import { describe, it, expect } from 'vitest';
import { countDeckStats } from './deck-stats';

const NOW = new Date('2026-01-10T12:00:00Z');
const YESTERDAY = new Date('2026-01-09T12:00:00Z');
const TOMORROW = new Date('2026-01-11T12:00:00Z');

describe('countDeckStats', () => {
  it('counts a never-studied card as new', () => {
    expect(countDeckStats([null, null], NOW)).toEqual({
      total: 2,
      novos: 2,
      aprender: 0,
      revisar: 0,
    });
  });

  it('counts a due hard card as "aprender"', () => {
    const stats = countDeckStats([{ dificuldade: 5, proximaRevisao: YESTERDAY }], NOW);
    expect(stats).toMatchObject({ aprender: 1, revisar: 0 });
  });

  it('counts a due easy card as "revisar"', () => {
    const stats = countDeckStats([{ dificuldade: 2, proximaRevisao: YESTERDAY }], NOW);
    expect(stats).toMatchObject({ aprender: 0, revisar: 1 });
  });

  it('counts a card due exactly now', () => {
    const stats = countDeckStats([{ dificuldade: 1, proximaRevisao: NOW }], NOW);
    expect(stats).toMatchObject({ revisar: 1 });
  });

  it('ignores cards that are not due yet', () => {
    const stats = countDeckStats([{ dificuldade: 5, proximaRevisao: TOMORROW }], NOW);
    expect(stats).toEqual({ total: 1, novos: 0, aprender: 0, revisar: 0 });
  });

  it('always reports the deck total, whatever the state', () => {
    const cards = [
      null,
      { dificuldade: 4, proximaRevisao: YESTERDAY },
      { dificuldade: 1, proximaRevisao: YESTERDAY },
      { dificuldade: 1, proximaRevisao: TOMORROW },
    ];
    expect(countDeckStats(cards, NOW)).toEqual({ total: 4, novos: 1, aprender: 1, revisar: 1 });
  });

  it('counts an empty deck as zero', () => {
    expect(countDeckStats([], NOW)).toEqual({ total: 0, novos: 0, aprender: 0, revisar: 0 });
  });
});
