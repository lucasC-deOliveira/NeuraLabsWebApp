import { describe, it, expect, beforeEach } from "vitest";
import { loadCachedGraph, saveCachedGraph, forgetCachedGraph, type CachedGraph } from "./graph-cache";

// get/set/remove bastam para load/save/forget. A robustez do mecanismo (JSON
// corrompido) é coberta em local-cache-store.spec.
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
}

const graph = (nodeCount = 1): CachedGraph => ({
  nodes: Array.from({ length: nodeCount }, (_, i) => ({ id: `n${i}` }) as never),
  edges: [],
  zoom: 0.8,
  pan: { x: 10, y: 20 },
  grafoNome: "Bio",
  savedAt: 123,
});

beforeEach(() => {
  (globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage = new FakeLocalStorage();
});

describe("graph-cache", () => {
  it("returns null when nothing is cached for the graph", () => {
    expect(loadCachedGraph("g1")).toBeNull();
  });

  it("round-trips a cached graph per id", () => {
    saveCachedGraph("g1", graph());
    expect(loadCachedGraph("g1")?.grafoNome).toBe("Bio");
    expect(loadCachedGraph("g1")?.pan).toEqual({ x: 10, y: 20 });
    expect(loadCachedGraph("other")).toBeNull();
  });

  it("skips caching graphs larger than the node cap", () => {
    saveCachedGraph("big", graph(4001));
    expect(loadCachedGraph("big")).toBeNull();
  });

  // Esquecer um grafo: apagá-lo não deixa o cache ressuscitar sua vista.
  it("forgets a specific graph's cache", () => {
    saveCachedGraph("g1", graph());
    forgetCachedGraph("g1");
    expect(loadCachedGraph("g1")).toBeNull();
  });
});
