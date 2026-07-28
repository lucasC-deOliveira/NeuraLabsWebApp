import { describe, it, expect, beforeEach } from "vitest";
import { loadCachedProvas, saveCachedProvas, invalidateProvasList } from "./provas-cache";
import type { ProvaListItem } from "../../domain/prova.types";

// API Storage completa (incl. length/key) porque invalidateProvasList varre por tag.
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

const prova = (over: Partial<ProvaListItem> = {}): ProvaListItem => ({
  id: "p1",
  titulo: "Enem 2025",
  descricao: "Segundo dia",
  totalQuestoes: 90,
  dataCriacao: "2026-07-01T12:00:00.000Z",
  ...over,
});

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: new FakeLocalStorage(), writable: true });
});

describe("provas cache", () => {
  it("has nothing cached before the first save", () => {
    expect(loadCachedProvas()).toBeNull();
  });

  it("round-trips the exams it saved", () => {
    saveCachedProvas([prova(), prova({ id: "p2", titulo: "Serpro 2023" })]);
    expect(loadCachedProvas()?.map((p) => p.titulo)).toEqual(["Enem 2025", "Serpro 2023"]);
  });

  it("keeps an empty list as an empty list, not as no cache", () => {
    saveCachedProvas([]);
    expect(loadCachedProvas()).toEqual([]);
  });

  // Regressão: foi um payload de formato antigo que deixou o baralho em tela preta.
  it("refuses a payload from an older shape, instead of returning it", () => {
    saveCachedProvas([{ id: "p1" } as unknown as ProvaListItem]);
    expect(loadCachedProvas()).toBeNull();
  });

  // Invalidação proativa: após criar/apagar prova, a listagem cacheada some.
  it("invalidateProvasList drops the cached list", () => {
    saveCachedProvas([prova()]);
    invalidateProvasList();
    expect(loadCachedProvas()).toBeNull();
  });
});
