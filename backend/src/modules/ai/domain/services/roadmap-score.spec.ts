import { describe, it, expect } from 'vitest';
import { scoreConceitos, isRoadmapMode, type ConceitoSignal } from './roadmap-score';

const signals: ConceitoSignal[] = [
  { refId: 'a', nome: 'A', provaFreq: 4, covered: false },
  { refId: 'b', nome: 'B', provaFreq: 0, covered: true },
  { refId: 'c', nome: 'C', provaFreq: 2, covered: true },
];

describe('scoreConceitos', () => {
  it('prova mode ranks by normalized past-exam frequency, ignoring edital coverage', () => {
    const scored = scoreConceitos(signals, 'prova');
    const by = new Map(scored.map((s) => [s.refId, s.score]));
    expect(by.get('a')).toBe(1); // 4/4 (max)
    expect(by.get('c')).toBe(0.5); // 2/4
    expect(by.get('b')).toBe(0); // no exam frequency, coverage irrelevant here
  });

  it('edital mode scores 1 for covered concepts and 0 otherwise', () => {
    const by = new Map(scoreConceitos(signals, 'edital').map((s) => [s.refId, s.score]));
    expect(by.get('a')).toBe(0);
    expect(by.get('b')).toBe(1);
    expect(by.get('c')).toBe(1);
  });

  it('prova_edital averages the two normalized signals', () => {
    const by = new Map(scoreConceitos(signals, 'prova_edital').map((s) => [s.refId, s.score]));
    expect(by.get('a')).toBe(0.5); // (1 + 0) / 2
    expect(by.get('c')).toBe(0.75); // (0.5 + 1) / 2
    expect(by.get('b')).toBe(0.5); // (0 + 1) / 2
  });

  it('carries a human reason per concept', () => {
    const scored = scoreConceitos(signals, 'edital');
    expect(scored.find((s) => s.refId === 'b')?.motivo).toContain('edital');
  });
});

describe('isRoadmapMode', () => {
  it('accepts the deterministic modes and the ai mode', () => {
    expect(isRoadmapMode('prova')).toBe(true);
    expect(isRoadmapMode('ai')).toBe(true);
    expect(isRoadmapMode('nope')).toBe(false);
  });
});
