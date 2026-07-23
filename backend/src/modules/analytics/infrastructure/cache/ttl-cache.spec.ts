import { describe, it, expect } from 'vitest';
import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
  it('computes on a miss and serves the cached value on the next hit', async () => {
    const cache = new TtlCache(1_000);
    let calls = 0;
    const compute = async (): Promise<number> => {
      calls += 1;
      return 42;
    };

    const first = await cache.getOrCompute('k', compute);
    const second = await cache.getOrCompute('k', compute);

    expect(first).toBe(42);
    expect(second).toBe(42);
    expect(calls).toBe(1);
  });

  it('recomputes once the entry has expired', async () => {
    let nowMs = 0;
    const cache = new TtlCache(1_000, () => nowMs);
    let calls = 0;
    const compute = async (): Promise<number> => {
      calls += 1;
      return calls;
    };

    await cache.getOrCompute('k', compute);
    nowMs = 1_001; // passou o TTL
    const afterExpiry = await cache.getOrCompute('k', compute);

    expect(afterExpiry).toBe(2);
    expect(calls).toBe(2);
  });

  it('keeps distinct keys isolated', async () => {
    const cache = new TtlCache(1_000);

    const a = await cache.getOrCompute('a', async () => 'a-value');
    const b = await cache.getOrCompute('b', async () => 'b-value');

    expect(a).toBe('a-value');
    expect(b).toBe('b-value');
  });

  it('rejects a non-positive ttl with the offending value', () => {
    expect(() => new TtlCache(0)).toThrow('invalid ttlMs: 0. Expected: positive milliseconds');
  });
});
