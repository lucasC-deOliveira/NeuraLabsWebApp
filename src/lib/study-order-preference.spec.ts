import { describe, it, expect, beforeEach } from "vitest";
import { loadStudyOrder, saveStudyOrder } from "./study-order-preference";

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

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: new FakeLocalStorage(), writable: true });
});

describe("study order preference", () => {
  it("opens in the classic order, the behaviour that already existed", () => {
    expect(loadStudyOrder()).toBe("classico");
  });

  it("round-trips the chosen order", () => {
    saveStudyOrder("peso");
    expect(loadStudyOrder()).toBe("peso");
  });

  // O disco é fronteira não confiável: pode ter sido gravado por outra versão.
  it("falls back to the default when the stored value is not an order", () => {
    localStorage.setItem("neuralabs.study-order", "modo-que-nao-existe");
    expect(loadStudyOrder()).toBe("classico");
  });
});
