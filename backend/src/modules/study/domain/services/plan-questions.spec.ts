import { describe, it, expect } from 'vitest';
import { orderPlanQuestions, type RankableQuestion } from './plan-questions';

const q = (id: string, conceitoId: string | null): RankableQuestion => ({ id, conceitoId });

describe('orderPlanQuestions', () => {
  const order = ['c1', 'c2', 'c3'];

  it('orders by the concept position in the roadmap', () => {
    const out = orderPlanQuestions([q('a', 'c3'), q('b', 'c1')], order, new Set());
    expect(out.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('drops questions already answered correctly', () => {
    const out = orderPlanQuestions([q('a', 'c1'), q('b', 'c2')], order, new Set(['a']));
    expect(out.map((x) => x.id)).toEqual(['b']);
  });

  it('pushes questions of concepts outside the roadmap to the end, stably', () => {
    const out = orderPlanQuestions([q('a', 'zzz'), q('b', 'c2'), q('c', null)], order, new Set());
    expect(out.map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });
});
