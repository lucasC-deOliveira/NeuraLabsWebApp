// Cache em memória com expiração por TTL. Escopo de processo único (não
// compartilha entre réplicas) — suficiente para aliviar as agregações caras
// de analytics em leituras repetidas. Tolera staleness curto: os dashboards
// não precisam refletir a última revisão em tempo real.
interface CacheEntry {
  value: unknown;
  expiresAt: number; // epoch ms
}

export class TtlCache {
  private readonly store = new Map<string, CacheEntry>();

  // `clock` é injetável para testar a expiração de forma determinística.
  constructor(
    private readonly ttlMs: number,
    private readonly clock: () => number = Date.now,
  ) {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new Error(`invalid ttlMs: ${ttlMs}. Expected: positive milliseconds`);
    }
  }

  // Devolve o valor em cache (se fresco) ou computa, guarda e devolve.
  async getOrCompute<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const hit = this.fresh(key);
    if (hit) return hit.value as T;
    const value = await compute();
    this.store.set(key, { value, expiresAt: this.clock() + this.ttlMs });
    return value;
  }

  // Entrada não-expirada, ou null; remove a expirada de passagem.
  private fresh(key: string): CacheEntry | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.clock()) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }
}
