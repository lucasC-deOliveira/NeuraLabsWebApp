// Cache de leitura do backend. Interface fina (port): os use-cases dependem disto,
// não de um cliente concreto — hoje in-memory, amanhã Redis, sem tocar em quem usa.
// Async de propósito: um adapter Redis futuro é assíncrono.
//
// `tags` agrupam chaves para invalidação em lote (ex.: tag `user:<id>` em tudo que
// depende de um usuário; `delByTag('user:<id>')` derruba o grupo numa escrita).
export interface CachePort {
  /** Valor em cache (fresco) ou computa, guarda sob `key`/`tags` e devolve. */
  getOrCompute<T>(
    key: string,
    ttlMs: number,
    compute: () => Promise<T>,
    tags?: string[],
  ): Promise<T>;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number, tags?: string[]): Promise<void>;
  del(key: string): Promise<void>;
  delByTag(tag: string): Promise<void>;
}

export const CACHE_PORT = Symbol('CACHE_PORT');
