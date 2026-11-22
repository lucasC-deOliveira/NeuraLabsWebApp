import { expect, it } from "vitest";
import { loadExpandedDecks, saveExpandedDecks } from "./expanded-decks-storage";

class FakeDeckPreferenceStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

it("restores only the expanded exceptions saved for each graph", () => {
  const storage = new FakeDeckPreferenceStorage();
  expect(loadExpandedDecks("first", storage)).toEqual(new Set());
  saveExpandedDecks("first", new Set(["deck-a"]), storage);
  expect(loadExpandedDecks("first", storage)).toEqual(new Set(["deck-a"]));
  expect(loadExpandedDecks("second", storage)).toEqual(new Set());
  saveExpandedDecks("first", new Set(), storage);
  expect(loadExpandedDecks("first", storage)).toEqual(new Set());
});

it("falls back to the collapsed default when stored data is malformed", () => {
  const storage = new FakeDeckPreferenceStorage();
  storage.setItem("neuralabs.expanded-decks.v1:first", "{invalid");
  expect(loadExpandedDecks("first", storage)).toEqual(new Set());
});
