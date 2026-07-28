import { describe, it, expect } from 'vitest';
import { InMemoryCache } from './in-memory-cache';

// Relógio controlável para testar TTL de forma determinística.
class FakeClock {
  public t = 1000;
  now = (): number => this.t;
}

describe('InMemoryCache', () => {
  it('rejects a non-positive maxSize', () => {
    expect(() => new InMemoryCache(0)).toThrow(/maxSize/);
  });

  it('computes on miss and returns the cached value on hit (compute runs once)', async () => {
    const cache = new InMemoryCache();
    let calls = 0;
    const compute = (): Promise<number> => {
      calls++;
      return Promise.resolve(42);
    };
    expect(await cache.getOrCompute('k', 1000, compute)).toBe(42);
    expect(await cache.getOrCompute('k', 1000, compute)).toBe(42);
    expect(calls).toBe(1);
  });

  it('recomputes after the TTL expires', async () => {
    const clock = new FakeClock();
    const cache = new InMemoryCache(100, clock.now);
    let calls = 0;
    const compute = (): Promise<number> => Promise.resolve(++calls);
    await cache.getOrCompute('k', 500, compute);
    clock.t += 501; // expira
    expect(await cache.getOrCompute('k', 500, compute)).toBe(2);
    expect(calls).toBe(2);
  });

  it('get returns null on miss and the value on hit', async () => {
    const cache = new InMemoryCache();
    expect(await cache.get('x')).toBeNull();
    await cache.set('x', 'v', 1000);
    expect(await cache.get('x')).toBe('v');
  });

  it('evicts the least-recently-used when over maxSize', async () => {
    const cache = new InMemoryCache(2);
    await cache.set('a', 1, 10_000);
    await cache.set('b', 2, 10_000);
    await cache.get('a'); // 'a' vira o mais recente → 'b' é o LRU
    await cache.set('c', 3, 10_000); // estoura o teto → despeja 'b'
    expect(await cache.get('b')).toBeNull();
    expect(await cache.get('a')).toBe(1);
    expect(await cache.get('c')).toBe(3);
  });

  it('invalidates every key of a tag with delByTag', async () => {
    const cache = new InMemoryCache();
    await cache.set('plan:today:p1', 1, 10_000, ['user:u1']);
    await cache.set('graph:list:u1', 2, 10_000, ['user:u1']);
    await cache.set('other', 3, 10_000, ['user:u2']);
    await cache.delByTag('user:u1');
    expect(await cache.get('plan:today:p1')).toBeNull();
    expect(await cache.get('graph:list:u1')).toBeNull();
    expect(await cache.get('other')).toBe(3); // outra tag intacta
  });

  it('del removes a single key', async () => {
    const cache = new InMemoryCache();
    await cache.set('k', 'v', 10_000);
    await cache.del('k');
    expect(await cache.get('k')).toBeNull();
  });

  it('rejects a non-positive ttl on set', () => {
    const cache = new InMemoryCache();
    expect(() => cache.set('k', 'v', 0)).toThrow(/ttlMs/);
  });
});
