import { describe, it, expect } from "vitest";
import { toExportPayload, exportFileName } from "./export-baralhos";
import type { BaralhoDetail } from "../baralho.types";

const DATE = new Date("2026-07-14T12:00:00Z");

function detail(over: Partial<BaralhoDetail> = {}): BaralhoDetail {
  return { id: "b1", titulo: "Bio", dataCriacao: DATE, origens: [], cards: [], ...over };
}

describe("toExportPayload", () => {
  it("exports title and both sides of each card", () => {
    const baralhos = [
      detail({
        cards: [{ id: "c1", pergunta: "p", resposta: "r", tipo: "DEFINICAO", conceito: "Alelos" }],
      }),
    ];
    expect(toExportPayload(baralhos)).toEqual([
      { titulo: "Bio", cards: [{ pergunta: "p", resposta: "r" }] },
    ]);
  });

  it("keeps a deck with no cards, so an empty deck still round-trips its title", () => {
    expect(toExportPayload([detail({ titulo: "Vazio" })])).toEqual([
      { titulo: "Vazio", cards: [] },
    ]);
  });

  it("exports nothing for no decks", () => {
    expect(toExportPayload([])).toEqual([]);
  });
});

describe("exportFileName", () => {
  it("dates the file so exports do not overwrite each other", () => {
    expect(exportFileName(DATE)).toBe("baralhos-2026-07-14.json");
  });
});
