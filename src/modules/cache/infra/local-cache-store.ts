import type { CacheStore, CacheSlot, SlotDef } from "../domain/cache-store";

// Namespace no localStorage — a varredura por tag só olha estas chaves.
const PREFIX = "neuralabs.cache.";

// O que de fato é gravado: os metadados (ts/ttl/tags) viajam junto do payload
// para que TTL e invalidação por tag funcionem entre reloads. O localStorage é a
// única fonte da verdade — sem camada em memória, evitando estado que diverge do
// disco (e que vazaria entre testes com o singleton).
interface Envelope {
  ts: number;
  ttlMs: number | null;
  tags: string[];
  data: unknown;
}

function storageKey(key: string, version: number): string {
  return `${PREFIX}${key}@v${version}`;
}

// Acesso silencioso ao localStorage: indisponível (SSR/modo privado) ou quota
// estourada nunca derrubam a UI — cache é só otimização.
function readRaw(sk: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(sk);
  } catch {
    return null;
  }
}

function writeRaw(sk: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(sk, value);
  } catch {
    // quota estourada / modo privado — ignora.
  }
}

function removeRaw(sk: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(sk);
  } catch {
    // ignora.
  }
}

function parseEnvelope(raw: string | null): Envelope | null {
  if (!raw) return null;
  try {
    const env = JSON.parse(raw) as Envelope;
    return env && typeof env === "object" && Array.isArray(env.tags) ? env : null;
  } catch {
    return null;
  }
}

// Chaves do nosso namespace no localStorage — pela API Storage (length/key),
// não Object.keys, para funcionar com qualquer implementação de Storage.
function storedCacheKeys(): string[] {
  if (typeof localStorage === "undefined") return [];
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) pushIfCacheKey(keys, localStorage.key(i));
  } catch {
    return keys;
  }
  return keys;
}

function pushIfCacheKey(keys: string[], candidate: string | null): void {
  if (candidate && candidate.startsWith(PREFIX)) keys.push(candidate);
}

function taggedInStorage(sk: string, tag: string): boolean {
  const env = parseEnvelope(readRaw(sk));
  return env ? env.tags.includes(tag) : false;
}

/**
 * Cache unificado do frontend sobre localStorage. Um slot amarra chave + versão +
 * TTL + tags + accept/revive; o store invalida por tag. Falhas são silenciosas.
 * @example const slot = cacheStore.slot({ key: 'baralhos-list', version: 1, tags: ['baralhos'] });
 */
export class LocalCacheStore implements CacheStore {
  constructor(private readonly now: () => number = (): number => Date.now()) {}

  slot<T>(def: SlotDef<T>): CacheSlot<T> {
    const sk = storageKey(def.key, def.version);
    return {
      read: (): T | null => this.readSlot(sk, def),
      write: (value: T): void => this.writeSlot(sk, def, value),
      invalidate: (): void => removeRaw(sk),
    };
  }

  invalidateTag(tag: string): void {
    for (const sk of storedCacheKeys()) if (taggedInStorage(sk, tag)) removeRaw(sk);
  }

  private readSlot<T>(sk: string, def: SlotDef<T>): T | null {
    const env = parseEnvelope(readRaw(sk));
    if (!env || this.expired(env)) return null;
    const raw = env.data as T;
    if (def.accept && !def.accept(raw)) return null;
    return def.revive ? def.revive(raw) : raw;
  }

  private writeSlot<T>(sk: string, def: SlotDef<T>, value: T): void {
    const env: Envelope = {
      ts: this.now(),
      ttlMs: def.ttlMs ?? null,
      tags: def.tags ? [...def.tags] : [],
      data: value,
    };
    writeRaw(sk, JSON.stringify(env));
  }

  private expired(env: Envelope): boolean {
    return env.ttlMs !== null && this.now() - env.ts > env.ttlMs;
  }
}

// Instância única compartilhada por todo o app (não há DI container no frontend).
export const cacheStore: CacheStore = new LocalCacheStore();
