import { describe, it, expect } from 'vitest';
import { rankConceitoImportance, type ImportanceRow } from './conceito-importance';

const row = (conceitoId: string, topicoId: string | null, provaFreq: number): ImportanceRow => ({
  conceitoId,
  nome: conceitoId,
  topicoId,
  provaFreq,
});

describe('rankConceitoImportance', () => {
  it('ranks by prova frequency when the weight favors provas', () => {
    const ranked = rankConceitoImportance(
      [row('a', 't1', 5), row('b', 't1', 0), row('c', 't1', 2)],
      1, // only prova signal
    );
    expect(ranked.map((r) => r.conceitoId)).toEqual(['a', 'c', 'b']);
    expect(ranked[0].importancia).toBe(1);
    expect(ranked[2].importancia).toBe(0);
  });

  it('ranks by edital emphasis (topic breadth) when the weight favors the edital', () => {
    // t1 has 3 concepts (emphasized), t2 has 1; provas are equal.
    const ranked = rankConceitoImportance(
      [row('a', 't1', 1), row('b', 't1', 1), row('c', 't1', 1), row('d', 't2', 1)],
      0, // only edital signal
    );
    expect(ranked.find((r) => r.conceitoId === 'a')?.editalPeso).toBe(3);
    expect(ranked.find((r) => r.conceitoId === 'd')?.editalPeso).toBe(1);
    expect(ranked.find((r) => r.conceitoId === 'a')!.importancia).toBeGreaterThan(
      ranked.find((r) => r.conceitoId === 'd')!.importancia,
    );
  });

  it('balances both signals with the weight', () => {
    const ranked = rankConceitoImportance([row('a', 't1', 4), row('b', 't1', 0)], 0.5);
    // a: 0.5*1 + 0.5*1 = 1 ; b: 0.5*0 + 0.5*1 = 0.5
    expect(ranked.find((r) => r.conceitoId === 'a')!.importancia).toBe(1);
    expect(ranked.find((r) => r.conceitoId === 'b')!.importancia).toBe(0.5);
  });

  it('degrades gracefully with no provas imported yet (edital-only)', () => {
    const ranked = rankConceitoImportance([row('a', 't1', 0), row('b', 't2', 0)], 0.6);
    expect(ranked.every((r) => r.provaFreq === 0)).toBe(true);
    expect(ranked[0].importancia).toBeGreaterThanOrEqual(0);
  });
});
