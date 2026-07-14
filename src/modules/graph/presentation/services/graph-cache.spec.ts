import { describe, it, expect, beforeEach } from "vitest";
import { loadCachedGraph, saveCachedGraph, type CachedGraph } from "./graph-cache";

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

  it("returns null instead of throwing on corrupt JSON", () => {
    localStorage.setItem("neuralabs.graph-cache.g1", "{not json");
    expect(loadCachedGraph("g1")).toBeNull();
  });
});
