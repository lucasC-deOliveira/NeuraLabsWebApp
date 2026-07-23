import { describe, it, expect } from "vitest";
import { deckRadarData } from "./deck-radar-data";
import type { DeckStat } from "../../domain/deck-analytics.types";

const deck = (titulo: string, over: Partial<DeckStat> = {}): DeckStat => ({
  baralhoId: titulo,
  titulo,
  cards: 10,
  mature: 5,
  due: 3,
  reviewed: 8,
  accuracy: 70,
  ...over,
});

describe("deckRadarData", () => {
  it("builds three axes with a value per deck", () => {
    const { rows, decks } = deckRadarData([deck("A"), deck("B", { accuracy: 90, mature: 10 })]);
    expect(decks).toEqual(["A", "B"]);
    expect(rows.map((r) => r.axis)).toEqual(["Acurácia", "Maturidade", "Atividade"]);
    expect(rows[0]).toEqual({ axis: "Acurácia", A: 70, B: 90 });
    expect(rows[1]).toEqual({ axis: "Maturidade", A: 50, B: 100 });
  });

  it("limits to the top `limit` decks and treats null accuracy as 0", () => {
    const { decks, rows } = deckRadarData([deck("A"), deck("B"), deck("C"), deck("D", { accuracy: null })], 3);
    expect(decks).toHaveLength(3);
    expect(rows[0].D).toBeUndefined();
  });
});
