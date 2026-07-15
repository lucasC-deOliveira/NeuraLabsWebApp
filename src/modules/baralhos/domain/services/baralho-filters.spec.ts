import { describe, it, expect } from "vitest";
import {
  filterAndSortBaralhos,
  countActiveBaralhoFilters,
  pendingCount,
  originOptions,
  DEFAULT_BARALHO_CRITERIA as DEFAULTS,
  type BaralhoCriteria,
} from "./baralho-filters";
import type { BaralhoItem } from "../baralho.types";

function baralho(over: Partial<BaralhoItem> = {}): BaralhoItem {
  return {
    id: "b1",
    titulo: "Biologia",
    totalCards: 3,
    novos: 0,
    aprender: 0,
    revisar: 0,
    dataCriacao: new Date("2026-01-10T12:00:00Z"),
    origens: [],
    ...over,
  };
}

const criteria = (over: Partial<BaralhoCriteria> = {}): BaralhoCriteria => ({ ...DEFAULTS, ...over });

describe("pendingCount", () => {
  it("sums everything waiting to be studied today", () => {
    expect(pendingCount(baralho({ novos: 2, aprender: 1, revisar: 3 }))).toBe(6);
  });

  it("is zero for a deck with nothing due", () => {
    expect(pendingCount(baralho())).toBe(0);
  });
});

describe("filterAndSortBaralhos", () => {
  it("keeps every deck by default", () => {
    const items = [baralho({ id: "a" }), baralho({ id: "b" })];
    expect(filterAndSortBaralhos(items, DEFAULTS)).toHaveLength(2);
  });

  it("searches the title, ignoring case", () => {
    const items = [baralho({ id: "bio", titulo: "Biologia" }), baralho({ id: "qui", titulo: "Química" })];
    expect(filterAndSortBaralhos(items, criteria({ search: "BIO" })).map((b) => b.id)).toEqual(["bio"]);
  });

  it("filters by the graph the deck came from", () => {
    const items = [
      baralho({ id: "g1", origens: [{ grafoId: "g1", nome: "Grafo 1" }] }),
      baralho({ id: "g2", origens: [{ grafoId: "g2", nome: "Grafo 2" }] }),
      baralho({ id: "solto", origens: [] }),
    ];
    expect(filterAndSortBaralhos(items, criteria({ grafoId: "g1" })).map((b) => b.id)).toEqual(["g1"]);
  });

  it("keeps only decks with something to study when asked", () => {
    const items = [baralho({ id: "due", novos: 1 }), baralho({ id: "done" })];
    expect(filterAndSortBaralhos(items, criteria({ pendingOnly: true })).map((b) => b.id)).toEqual(["due"]);
  });

  it("sorts by most recent by default", () => {
    const items = [
      baralho({ id: "old", dataCriacao: new Date("2026-01-01T12:00:00Z") }),
      baralho({ id: "new", dataCriacao: new Date("2026-02-01T12:00:00Z") }),
    ];
    expect(filterAndSortBaralhos(items, DEFAULTS).map((b) => b.id)).toEqual(["new", "old"]);
  });

  it("sorts alphabetically by title", () => {
    const items = [baralho({ id: "z", titulo: "Zoologia" }), baralho({ id: "a", titulo: "Anatomia" })];
    expect(filterAndSortBaralhos(items, criteria({ sortBy: "alfabetica" })).map((b) => b.id)).toEqual(["a", "z"]);
  });

  it("sorts by deck size", () => {
    const items = [baralho({ id: "small", totalCards: 1 }), baralho({ id: "big", totalCards: 9 })];
    expect(filterAndSortBaralhos(items, criteria({ sortBy: "cartoes" })).map((b) => b.id)).toEqual(["big", "small"]);
  });

  it("sorts by what is waiting to be studied", () => {
    const items = [baralho({ id: "few", novos: 1 }), baralho({ id: "many", revisar: 5 })];
    expect(filterAndSortBaralhos(items, criteria({ sortBy: "estudar" })).map((b) => b.id)).toEqual(["many", "few"]);
  });

  it("does not mutate the given list", () => {
    const items = [baralho({ id: "z", titulo: "Z" }), baralho({ id: "a", titulo: "A" })];
    filterAndSortBaralhos(items, criteria({ sortBy: "alfabetica" }));
    expect(items.map((b) => b.id)).toEqual(["z", "a"]);
  });
});

describe("countActiveBaralhoFilters", () => {
  it("counts nothing for the default criteria", () => {
    expect(countActiveBaralhoFilters(DEFAULTS)).toBe(0);
  });

  it("counts each non-default filter", () => {
    expect(countActiveBaralhoFilters(criteria({ grafoId: "g1", pendingOnly: true, sortBy: "alfabetica" }))).toBe(3);
  });

  it("does not count the search box, which is visible on its own", () => {
    expect(countActiveBaralhoFilters(criteria({ search: "bio" }))).toBe(0);
  });
});

describe("originOptions", () => {
  it("lists each graph once, sorted by name", () => {
    const items = [
      baralho({ origens: [{ grafoId: "g2", nome: "Zoo" }] }),
      baralho({ origens: [{ grafoId: "g1", nome: "Anatomia" }, { grafoId: "g2", nome: "Zoo" }] }),
    ];
    expect(originOptions(items)).toEqual([
      { grafoId: "g1", nome: "Anatomia" },
      { grafoId: "g2", nome: "Zoo" },
    ]);
  });

  it("has no options when no deck came from a graph", () => {
    expect(originOptions([baralho()])).toEqual([]);
  });
});
