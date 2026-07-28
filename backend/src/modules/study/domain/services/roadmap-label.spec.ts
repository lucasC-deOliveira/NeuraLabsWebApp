import { describe, it, expect } from 'vitest';
import { roadmapLabel, roadmapScopeIds } from './roadmap-label';

describe('roadmapScopeIds', () => {
  it('extracts prova and edital ids from the key', () => {
    expect(roadmapScopeIds('prova_edital|p:x|e:y')).toEqual({ provaId: 'x', editalId: 'y' });
  });

  it('returns nothing for a base key', () => {
    expect(roadmapScopeIds('ai')).toEqual({ provaId: undefined, editalId: undefined });
  });
});

describe('roadmapLabel', () => {
  const names = new Map([
    ['x', 'TRF 2026'],
    ['y', 'Edital 01/2026'],
  ]);

  it('labels a base mode without scope', () => {
    expect(roadmapLabel('ai', new Map())).toBe('Prioridade da IA');
    expect(roadmapLabel('prova', new Map())).toBe('O que mais cai na prova');
  });

  it('appends the scope title when present', () => {
    expect(roadmapLabel('prova|p:x', names)).toBe('O que mais cai na prova: TRF 2026');
  });

  it('joins prova and edital scopes', () => {
    expect(roadmapLabel('prova_edital|p:x|e:y', names)).toBe(
      'Prova + edital: TRF 2026 / Edital 01/2026',
    );
  });
});
