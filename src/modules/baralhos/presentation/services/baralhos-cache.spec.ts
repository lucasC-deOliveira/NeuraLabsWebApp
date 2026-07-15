import { describe, it, expect, beforeEach } from "vitest";
import { loadCachedBaralhos, saveCachedBaralhos } from "./baralhos-cache";
import type { BaralhoItem } from "../../domain/baralho.types";

class FakeLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  clear(): void {
    this.store.clear();
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

  it("returns null instead of throwing on corrupt JSON", () => {
    localStorage.setItem("neuralabs.baralhos-cache.v1", "{not json");
    expect(loadCachedBaralhos()).toBeNull();
  });

  it("returns null instead of throwing when the cached shape is unusable", () => {
    localStorage.setItem("neuralabs.baralhos-cache.v1", JSON.stringify({ nope: true }));
    expect(loadCachedBaralhos()).toBeNull();
  });
});
