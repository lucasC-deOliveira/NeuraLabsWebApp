import { describe, it, expect, beforeEach } from "vitest";
import { LocalCacheStore } from "./local-cache-store";
import type { SlotDef } from "../domain/cache-store";

// Fake com a API Storage completa (getItem/setItem/removeItem + length/key),
// porque a varredura por tag usa length/key, não Object.keys.
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

function installStorage(): void {
  (globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage = new FakeLocalStorage();
}

interface Payload {
  when: Date;
  label: string;
}
const def: SlotDef<Payload> = {
  key: "sample",
  version: 1,
  tags: ["group"],
  revive: (raw): Payload => ({ ...raw, when: new Date(raw.when) }),
};

beforeEach(installStorage);

describe("LocalCacheStore", () => {
  it("returns null on a miss", () => {
    const slot = new LocalCacheStore().slot(def);
    expect(slot.read()).toBeNull();
  });

  it("round-trips a written value", () => {
    const slot = new LocalCacheStore().slot(def);
    slot.write({ when: new Date("2026-01-02T00:00:00Z"), label: "a" });
    expect(slot.read()?.label).toBe("a");
  });

  it("revives Date fields on read instead of leaving them as strings", () => {
    const slot = new LocalCacheStore().slot(def);
    slot.write({ when: new Date("2026-01-02T00:00:00Z"), label: "a" });
    const when = slot.read()?.when;
    expect(when).toBeInstanceOf(Date);
    expect(when?.toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });

  it("treats an older version as a miss instead of returning a stale shape", () => {
    new LocalCacheStore().slot({ ...def, version: 1 }).write({ when: new Date(), label: "old" });
    const next = new LocalCacheStore().slot({ ...def, version: 2 });
    expect(next.read()).toBeNull();
  });

  it("serves the value regardless of age when no TTL is set (pure SWR)", () => {
    let now = 1_000;
    const slot = new LocalCacheStore(() => now).slot(def);
    slot.write({ when: new Date(), label: "a" });
    now += 10_000_000;
    expect(slot.read()?.label).toBe("a");
  });

  it("expires the value past its TTL", () => {
    let now = 1_000;
    const slot = new LocalCacheStore(() => now).slot({ ...def, ttlMs: 5_000 });
    slot.write({ when: new Date(), label: "a" });
    now += 4_000;
    expect(slot.read()?.label).toBe("a");
    now += 2_000;
    expect(slot.read()).toBeNull();
  });

  it("invalidate() drops the slot", () => {
    const slot = new LocalCacheStore().slot(def);
    slot.write({ when: new Date(), label: "a" });
    slot.invalidate();
    expect(slot.read()).toBeNull();
  });

  it("invalidateTag() drops every slot carrying the tag", () => {
    const store = new LocalCacheStore();
    store.slot({ key: "a", version: 1, tags: ["group"] }).write(1);
    store.slot({ key: "b", version: 1, tags: ["group"] }).write(2);
    store.slot({ key: "c", version: 1, tags: ["other"] }).write(3);
    store.invalidateTag("group");
    expect(store.slot({ key: "a", version: 1, tags: ["group"] }).read()).toBeNull();
    expect(store.slot({ key: "b", version: 1, tags: ["group"] }).read()).toBeNull();
    expect(store.slot({ key: "c", version: 1, tags: ["other"] }).read()).toBe(3);
  });

  // Slot escrito numa sessão anterior (só no localStorage, ainda não lido nesta):
  // a invalidação por tag precisa alcançá-lo via varredura, não só a memória.
  it("invalidateTag() reaches a slot present only in localStorage", () => {
    new LocalCacheStore().slot({ key: "a", version: 1, tags: ["group"] }).write(1);
    const fresh = new LocalCacheStore();
    fresh.invalidateTag("group");
    expect(new LocalCacheStore().slot({ key: "a", version: 1, tags: ["group"] }).read()).toBeNull();
  });

  it("returns null instead of throwing on corrupt JSON", () => {
    localStorage.setItem("neuralabs.cache.sample@v1", "{not json");
    expect(new LocalCacheStore().slot(def).read()).toBeNull();
  });

  // Um reviver que quebra sobre um payload defasado vira miss, não crash.
  it("returns null instead of throwing when revive() throws on a stale payload", () => {
    const store = new LocalCacheStore();
    store.slot<{ items: number[] | null }>({ key: "rev", version: 1 }).write({ items: null });
    const guarded = store.slot<{ items: number[] | null }>({
      key: "rev",
      version: 1,
      revive: (raw): { items: number[] | null } => ({ items: raw.items!.map((n) => n + 1) }),
    });
    expect(guarded.read()).toBeNull();
  });

  // Fronteira não confiável: um payload que não passa no accept vira miss.
  it("rejects a stored payload whose shape accept() refuses", () => {
    const store = new LocalCacheStore();
    const write = store.slot<{ n: number }>({ key: "shape", version: 1 });
    write.write({ n: 1 });
    const guarded = store.slot<{ n: number }>({
      key: "shape",
      version: 1,
      accept: (raw): boolean => typeof raw.n === "string",
    });
    expect(guarded.read()).toBeNull();
  });
});
