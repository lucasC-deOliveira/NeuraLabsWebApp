import { describe, it, expect } from "vitest";
import { filterCardOptions, excludeCardsInDeck } from "./filter-card-options";
import type { BaralhoCardOption } from "../baralho.types";

const options: BaralhoCardOption[] = [
  { id: "c1", pergunta: "O que e fotossintese?", conceito: "Fotossintese" },
  { id: "c2", pergunta: "Defina alelo", conceito: "Alelos" },
];

describe("filterCardOptions", () => {
  it("returns every option when the search is blank", () => {
    expect(filterCardOptions(options, "   ")).toHaveLength(2);
  });

  it("matches the question, ignoring case", () => {
    expect(filterCardOptions(options, "FOTOSSIN").map((o) => o.id)).toEqual(["c1"]);
  });

  it("matches the concept", () => {
    expect(filterCardOptions(options, "alelos").map((o) => o.id)).toEqual(["c2"]);
  });

  it("returns nothing when no option matches", () => {
    expect(filterCardOptions(options, "quimica")).toEqual([]);
  });
});

describe("excludeCardsInDeck", () => {
  it("hides cards already in the deck", () => {
    expect(excludeCardsInDeck(options, ["c1"]).map((o) => o.id)).toEqual(["c2"]);
  });

  it("keeps every option for an empty deck", () => {
    expect(excludeCardsInDeck(options, [])).toHaveLength(2);
  });
});
