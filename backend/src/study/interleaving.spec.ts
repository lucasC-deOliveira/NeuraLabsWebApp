import { describe, it, expect } from 'vitest';
import { applyInterleaving } from './interleaving';

// Caracterização do intercalamento de cartas por conceito.
type Card = { id: number; conceito: string | null };
const card = (id: number, conceito: string | null): Card => ({ id, conceito });

// Maior sequência de cartas consecutivas do mesmo conceito no resultado.
function maxRun(cards: Card[]): number {
  let max = 0;
  let run = 0;
  let prev: string | null | undefined;
  for (const c of cards) {
    const k = c.conceito ?? '';
    run = k === prev ? run + 1 : 1;
    prev = k;
    if (run > max) max = run;
  }
  return max;
}

describe('applyInterleaving', () => {
  it('retorna uma cópia quando há <= maxPerConcept cartas', () => {
    const input = [card(1, 'A'), card(2, 'A')];
    const out = applyInterleaving(input, 2);
    expect(out).toEqual(input);
    expect(out).not.toBe(input); // cópia, não a mesma referência
  });

  it('preserva todas as cartas (mesma quantidade por conceito)', () => {
    const input = [
      card(1, 'A'), card(2, 'A'), card(3, 'A'), card(4, 'A'),
      card(5, 'B'), card(6, 'B'),
      card(7, null),
    ];
    const out = applyInterleaving(input, 2);
    expect(out).toHaveLength(input.length);
    expect(new Set(out.map((c) => c.id))).toEqual(new Set(input.map((c) => c.id)));
  });

  it('não deixa mais de maxPerConcept do mesmo conceito seguidos quando há alternativa', () => {
    const input = [
      card(1, 'A'), card(2, 'A'), card(3, 'A'), card(4, 'A'),
      card(5, 'B'), card(6, 'B'), card(7, 'B'), card(8, 'B'),
    ];
    const out = applyInterleaving(input, 2);
    expect(maxRun(out)).toBeLessThanOrEqual(2);
  });

  it('respeita maxPerConcept = 1 (nunca dois iguais seguidos com alternativa)', () => {
    const input = [
      card(1, 'A'), card(2, 'A'), card(3, 'A'),
      card(4, 'B'), card(5, 'B'), card(6, 'B'),
    ];
    const out = applyInterleaving(input, 1);
    expect(maxRun(out)).toBeLessThanOrEqual(1);
  });

  it('agrupa conceito null como um grupo próprio (vazio)', () => {
    const input = [card(1, null), card(2, null), card(3, null), card(4, 'A')];
    const out = applyInterleaving(input, 2);
    expect(out).toHaveLength(4);
    expect(new Set(out.map((c) => c.id))).toEqual(new Set([1, 2, 3, 4]));
  });

  // Testes de ORDEM EXATA — fixam o algoritmo determinístico (Map preserva a
  // ordem de inserção dos conceitos), matando mutantes da lógica de fila.
  it('ordem exata: 4×A + 2×B (max 2) intercala os B entre os A', () => {
    const input = [
      card(1, 'A'), card(2, 'A'), card(3, 'A'), card(4, 'A'),
      card(5, 'B'), card(6, 'B'),
    ];
    const out = applyInterleaving(input, 2);
    expect(out.map((c) => c.id)).toEqual([1, 5, 2, 6, 3, 4]);
  });

  it('ordem exata com max 1: alterna estritamente A e B', () => {
    const input = [
      card(1, 'A'), card(2, 'A'), card(3, 'A'),
      card(4, 'B'), card(5, 'B'), card(6, 'B'),
    ];
    const out = applyInterleaving(input, 1);
    expect(out.map((c) => c.id)).toEqual([1, 4, 2, 5, 3, 6]);
  });

  it('fallback: conceito único é forçado a repetir, preservando a ordem', () => {
    const input = [card(1, 'A'), card(2, 'A'), card(3, 'A'), card(4, 'A'), card(5, 'A')];
    const out = applyInterleaving(input, 2);
    expect(out.map((c) => c.id)).toEqual([1, 2, 3, 4, 5]);
  });
});
