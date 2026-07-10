import { describe, it, expect, beforeEach } from "vitest";
import { loadGraphSettings, saveGraphSettings } from "./graph-settings-storage";
import { DEFAULT_PHYSICS_OPTIONS } from "./graph-physics.service";

// Fake nomeado do Web Storage (o env "node" do vitest não expõe localStorage).
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
  clear(): void {
    this.store.clear();
  }
}

// Storage que sempre lança — simula modo privado/quota estourada.
class ThrowingLocalStorage {
  getItem(): string {
    throw new Error("localStorage indisponível");
  }
  setItem(): void {
    throw new Error("localStorage indisponível");
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage = new FakeLocalStorage();
});

describe("graph-settings-storage", () => {
  it("returns null when nothing has been saved yet", () => {
    expect(loadGraphSettings()).toBeNull();
  });

  it("round-trips the saved settings", () => {
    saveGraphSettings({ physicsMode: "cluster", physicsOptions: DEFAULT_PHYSICS_OPTIONS, focusDepth: 3 });
    const loaded = loadGraphSettings();
    expect(loaded?.physicsMode).toBe("cluster");
    expect(loaded?.focusDepth).toBe(3);
    expect(loaded?.physicsOptions).toEqual(DEFAULT_PHYSICS_OPTIONS);
  });

  it("returns null (instead of throwing) when localStorage is unavailable", () => {
    (globalThis as unknown as { localStorage: ThrowingLocalStorage }).localStorage = new ThrowingLocalStorage();
    expect(loadGraphSettings()).toBeNull();
    expect(() => saveGraphSettings({ physicsMode: "default", physicsOptions: DEFAULT_PHYSICS_OPTIONS, focusDepth: 1 })).not.toThrow();
  });
});
