import { describe, expect, it } from "vitest";
import type { VaultStudyWrite } from "@/lib/vault-bridge";
import { emptyVaultLibrary, type VaultLibrary } from "../domain/vault-library";
import { ElectronVaultStudyStore } from "./electron-vault-study";

function withBiologyDeck(library: VaultLibrary): VaultLibrary {
  return { ...library, decks: [...library.decks, { id: "deck", title: "Biology", cards: [] }] };
}

class FakeVaultStudyFiles {
  snapshot: string | null = null;
  concurrentSnapshot: string | null = null;

  async readStudy(): Promise<string | null> {
    return this.snapshot;
  }

  async writeStudy(update: VaultStudyWrite): Promise<boolean> {
    if (this.concurrentSnapshot) {
      this.snapshot = this.concurrentSnapshot;
      this.concurrentSnapshot = null;
    }
    if (update.expected !== this.snapshot) return false;
    this.snapshot = update.next;
    return true;
  }
}

describe("ElectronVaultStudyStore", () => {
  it("opens an empty library and keeps a committed deck after reopening", async () => {
    const files = new FakeVaultStudyFiles();
    const store = new ElectronVaultStudyStore("vault", files);
    expect(await store.read()).toEqual(emptyVaultLibrary());
    await store.update(withBiologyDeck);
    expect((await new ElectronVaultStudyStore("vault", files).read()).decks[0].title).toBe("Biology");
  });

  it("preserves an intervening write when retrying a save", async () => {
    const files = new FakeVaultStudyFiles();
    files.concurrentSnapshot = JSON.stringify({
      ...emptyVaultLibrary(), decks: [{ id: "elsewhere", title: "Other deck", cards: [] }],
    });
    const store = new ElectronVaultStudyStore("vault", files);
    const library = await store.update(withBiologyDeck);
    expect(library.decks.map((deck) => deck.id)).toEqual(["elsewhere", "deck"]);
  });

  it("refuses to overwrite an unreadable snapshot", async () => {
    const files = new FakeVaultStudyFiles();
    files.snapshot = '{"formatVersion":2}';
    const store = new ElectronVaultStudyStore("vault", files);
    await expect(store.update(withBiologyDeck)).rejects.toThrow();
    expect(files.snapshot).toBe('{"formatVersion":2}');
  });

});
