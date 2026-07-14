import { describe, it, expect, beforeEach } from "vitest";
import { loadCachedGraphList, saveCachedGraphList } from "./graph-list-cache";
import type { GraphListParams, GraphListResult } from "../../domain/types/graph.types";

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

const result = (id: string): GraphListResult => ({
  items: [{ id, nome: id }],
  total: 1,
  page: 1,
  pageSize: 12,
});

beforeEach(() => {
  (globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage = new FakeLocalStorage();
});

describe("graph-list-cache", () => {
  it("returns null when nothing is cached for the query", () => {
    expect(loadCachedGraphList({ page: 1, pageSize: 12 })).toBeNull();
  });

  it("round-trips a cached page keyed by the query params", () => {
    const params: GraphListParams = { page: 1, pageSize: 12 };
    saveCachedGraphList(params, result("g1"));
    expect(loadCachedGraphList(params)?.items[0].id).toBe("g1");
  });

  it("keys distinct queries separately (page, filters)", () => {
    saveCachedGraphList({ page: 1, pageSize: 12 }, result("p1"));
    saveCachedGraphList({ page: 2, pageSize: 12 }, result("p2"));
    expect(loadCachedGraphList({ page: 1, pageSize: 12 })?.items[0].id).toBe("p1");
    expect(loadCachedGraphList({ page: 2, pageSize: 12 })?.items[0].id).toBe("p2");
  });

  it("ignores assunto selection order in the cache key", () => {
    saveCachedGraphList({ page: 1, pageSize: 12, assuntoIds: ["a", "b"] }, result("shared"));
    expect(loadCachedGraphList({ page: 1, pageSize: 12, assuntoIds: ["b", "a"] })?.items[0].id).toBe(
      "shared",
    );
  });

  it("returns null instead of throwing on corrupt JSON", () => {
    saveCachedGraphList({ page: 1, pageSize: 12 }, result("g1"));
    localStorage.setItem("neuralabs.graph-list-cache.broken", "{not json");
    expect(loadCachedGraphList({ page: 1, pageSize: 12 })?.items[0].id).toBe("g1");
  });
});
