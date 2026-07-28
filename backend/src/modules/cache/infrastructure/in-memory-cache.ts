import { Injectable } from '@nestjs/common';
import type { CachePort } from '../domain/cache-port';

interface Entry {
  value: unknown;
  expiresAt: number; // epoch ms
  tags: string[];
}

/**
 * Cache in-memory por processo: TTL por entrada (frescor) + LRU no teto de tamanho
 * (rede de segurança de memória) + tags para invalidação em lote. A ordem de inserção
 * do `Map` é a fila LRU; ler reinsere a chave (vai para o fim), então o `next()` do
 * início é sempre a menos usada recentemente.
 * @example cache.getOrCompute('plan:today:p1', 60_000, load, ['user:u1'])
 */
@Injectable()
export class InMemoryCache implements CachePort {
  private readonly store = new Map<string, Entry>();
  private readonly tagIndex = new Map<string, Set<string>>();

  constructor(
    private readonly maxSize = 5000,
    private readonly clock: () => number = Date.now,
  ) {
    if (!Number.isInteger(maxSize) || maxSize <= 0) {
      throw new Error(`invalid maxSize: ${maxSize}. Expected: positive integer`);
    }
  }

  async getOrCompute<T>(
    key: string,
    ttlMs: number,
    compute: () => Promise<T>,
    tags: string[] = [],
  ): Promise<T> {
    const hit = this.peek(key);
    if (hit) return hit.value as T;
    const value = await compute();
    await this.set(key, value, ttlMs, tags);
    return value;
  }

  get<T>(key: string): Promise<T | null> {
    const hit = this.peek(key);
    return Promise.resolve(hit ? (hit.value as T) : null);
  }

  set<T>(key: string, value: T, ttlMs: number, tags: string[] = []): Promise<void> {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new Error(`invalid ttlMs: ${ttlMs}. Expected: positive milliseconds`);
    }
    this.remove(key); // limpa tags/posição antigas antes de reinserir
    this.store.set(key, { value, expiresAt: this.clock() + ttlMs, tags });
    this.index(key, tags);
    this.evictIfNeeded();
    return Promise.resolve();
  }

  del(key: string): Promise<void> {
    this.remove(key);
    return Promise.resolve();
  }

  delByTag(tag: string): Promise<void> {
    const keys = this.tagIndex.get(tag);
    if (keys) for (const k of [...keys]) this.remove(k);
    return Promise.resolve();
  }

  // Entrada fresca (e move para o fim da fila LRU), ou null; remove a expirada.
  private peek(key: string): Entry | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.clock()) {
      this.remove(key);
      return null;
    }
    this.store.delete(key);
    this.store.set(key, entry); // reinsere → fim da fila (mais recente)
    return entry;
  }

  private index(key: string, tags: string[]): void {
    for (const t of tags) {
      const set = this.tagIndex.get(t) ?? new Set<string>();
      set.add(key);
      this.tagIndex.set(t, set);
    }
  }

  // Remove a chave do store e de todos os índices de tag.
  private remove(key: string): void {
    const entry = this.store.get(key);
    if (!entry) return;
    this.store.delete(key);
    for (const t of entry.tags) {
      const set = this.tagIndex.get(t);
      if (!set) continue;
      set.delete(key);
      if (set.size === 0) this.tagIndex.delete(t);
    }
  }

  private evictIfNeeded(): void {
    while (this.store.size > this.maxSize) {
      const oldest = this.store.keys().next().value; // início = LRU
      if (oldest === undefined) break;
      this.remove(oldest);
    }
  }
}
