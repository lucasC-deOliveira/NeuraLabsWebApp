import { describe, it, expect, beforeEach } from "vitest";
import { loadCachedBaralhos, saveCachedBaralhos, invalidateBaralhosList } from "./baralhos-cache";
import type { BaralhoItem } from "../../domain/baralho.types";

// API Storage completa (incl. length/key) porque invalidateBaralhosList varre as
// chaves do namespace por tag.
class FakeLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
}

const CREATED = new Date("2026-07-14T12:00:00Z");

function baralho(over: Partial<BaralhoItem> = {}): BaralhoItem {
  return {
    id: "b1",
    titulo: "Biologia",
    totalCards: 3,
    novos: 1,
    aprender: 0,
    revisar: 2,
    dataCriacao: CREATED,
    origens: [],
    ...over,
  };
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage = new FakeLocalStorage();
});

describe("baralhos-cache", () => {
  it("returns null when nothing is cached", () => {
    expect(loadCachedBaralhos()).toBeNull();
  });

  it("round-trips the cached decks", () => {
    saveCachedBaralhos([baralho()]);
    expect(loadCachedBaralhos()?.[0]).toMatchObject({ id: "b1", titulo: "Biologia", novos: 1 });
  });

  it("revives the creation date as Date, not the serialized string", () => {
    saveCachedBaralhos([baralho()]);
    const revived = loadCachedBaralhos()?.[0].dataCriacao;
    expect(revived).toBeInstanceOf(Date);
    expect(revived?.getTime()).toBe(CREATED.getTime());
  });

  it("keeps the graph origins", () => {
    saveCachedBaralhos([baralho({ origens: [{ grafoId: "g1", nome: "Grafo" }] })]);
    expect(loadCachedBaralhos()?.[0].origens).toEqual([{ grafoId: "g1", nome: "Grafo" }]);
  });

  it("caches an empty list as an empty list, not as a miss", () => {
    saveCachedBaralhos([]);
    expect(loadCachedBaralhos()).toEqual([]);
  });

  // Invalidação proativa: após criar/apagar um baralho, a listagem cacheada some
  // para não ressuscitar dado velho em outra tela/aba.
  it("invalidateBaralhosList drops the cached list", () => {
    saveCachedBaralhos([baralho()]);
    invalidateBaralhosList();
    expect(loadCachedBaralhos()).toBeNull();
  });
});
