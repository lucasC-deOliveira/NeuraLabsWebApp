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

describe('scoreConceitos with pesoEdital', () => {
  const signal = (over: Partial<ConceitoSignal>): ConceitoSignal => ({
    refId: 'c1',
    nome: 'C',
    provaFreq: 0,
    covered: true,
    ...over,
  });

  // Sem peso declarado o ranking tem de ser exatamente o de antes, senão a
  // migração muda a ordem de estudo de quem nunca preencheu o campo.
  it('scores exactly like the old boolean coverage when no weight is declared', () => {
    const signals = [signal({ refId: 'a' }), signal({ refId: 'b', covered: false })];
    const scores = scoreConceitos(signals, 'edital');
    expect(scores.map((s) => s.score)).toEqual([1, 0]);
  });

  it('ranks a heavier topic above a lighter one, both in the edital', () => {
    const signals = [
      signal({ refId: 'gestao', pesoEdital: 1.6 }),
      signal({ refId: 'engenharia', pesoEdital: 0.8 }),
    ];
    const scores = scoreConceitos(signals, 'edital');
    expect(scores[0].score).toBe(1);
    expect(scores[1].score).toBe(0.5);
  });

  // Peso não resgata quem está fora do edital: a cobertura continua sendo a condição.
  it('keeps a concept outside the edital at zero however heavy it is', () => {
    const signals = [signal({ refId: 'fora', covered: false, pesoEdital: 2 })];
    expect(scoreConceitos(signals, 'edital')[0].score).toBe(0);
  });

  it('treats an undeclared weight as the neutral 1 next to declared ones', () => {
    const signals = [signal({ refId: 'pesado', pesoEdital: 2 }), signal({ refId: 'neutro' })];
    const scores = scoreConceitos(signals, 'edital');
    expect(scores[0].score).toBe(1);
    expect(scores[1].score).toBe(0.5);
  });

  it('ignores a zero or negative weight instead of erasing the concept', () => {
    const signals = [
      signal({ refId: 'zero', pesoEdital: 0 }),
      signal({ refId: 'neg', pesoEdital: -3 }),
    ];
    const scores = scoreConceitos(signals, 'edital');
    expect(scores.map((s) => s.score)).toEqual([1, 1]);
  });

  it('does not touch the prova mode, which knows nothing about the edital', () => {
    const signals = [signal({ refId: 'a', provaFreq: 4, pesoEdital: 1.6 })];
    expect(scoreConceitos(signals, 'prova')[0].score).toBe(1);
  });

  it('explains the weight in the motivo so the order is readable', () => {
    const scores = scoreConceitos([signal({ pesoEdital: 1.6 })], 'edital');
    expect(scores[0].motivo).toBe('Cobrado pelo edital (peso 1.6)');
  });

  it('keeps the plain motivo when no weight is declared', () => {
    const scores = scoreConceitos([signal({})], 'edital');
    expect(scores[0].motivo).toBe('Cobrado pelo edital');
  });
});
