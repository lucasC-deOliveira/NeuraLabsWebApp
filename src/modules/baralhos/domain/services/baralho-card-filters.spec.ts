import { describe, it, expect } from "vitest";
import {
  filterAndSortBaralhoCards,
  cardTipoOptions,
  cardTagOptions,
  countActiveCardFilters,
  formatTipoLabel,
  DEFAULT_CARD_CRITERIA as DEFAULTS,
  type BaralhoCardCriteria,
} from "./baralho-card-filters";
import type { BaralhoCard, BaralhoConceptTag } from "../baralho.types";

function tag(over: Partial<BaralhoConceptTag> = {}): BaralhoConceptTag {
  return {
    conceito: "Fotossintese",
    topico: "Celula",
    topicoId: "t1",
    assunto: "Biologia",
    assuntoId: "a1",
    ...over,
  };
}

function card(over: Partial<BaralhoCard> = {}): BaralhoCard {
  return {
    id: "c1",
    pergunta: "O que e fotossintese?",
    resposta: "Processo das plantas",
    tipo: "DEFINICAO",
    conceito: "Fotossintese",
    conceitosConectados: [],
    ...over,
  };
}

const criteria = (over: Partial<BaralhoCardCriteria> = {}): BaralhoCardCriteria => ({
  ...DEFAULTS,
  ...over,
});

describe("filterAndSortBaralhoCards", () => {
  it("keeps every card by default", () => {
    expect(filterAndSortBaralhoCards([card({ id: "a" }), card({ id: "b" })], DEFAULTS)).toHaveLength(2);
  });

  it("searches the question, answer and concept", () => {
    const cards = [
      card({ id: "q", pergunta: "sobre mitocondria", conceito: "X" }),
      card({ id: "r", pergunta: "p", resposta: "a mitocondria produz", conceito: "X" }),
      card({ id: "c", pergunta: "p", resposta: "r", conceito: "Mitocondria" }),
      card({ id: "fora", pergunta: "p", resposta: "r", conceito: "X" }),
    ];
    const ids = filterAndSortBaralhoCards(cards, criteria({ search: "MITOC" })).map((c) => c.id);
    expect(ids.sort()).toEqual(["c", "q", "r"]);
  });

  it("searches the connected concept tags too", () => {
    const cards = [
      card({ id: "tagged", conceito: "X", conceitosConectados: [tag({ conceito: "Alelos" })] }),
      card({ id: "outro", conceito: "X" }),
    ];
    expect(filterAndSortBaralhoCards(cards, criteria({ search: "alelos" })).map((c) => c.id)).toEqual(
      ["tagged"],
    );
  });

  it("filters by tipo", () => {
    const cards = [card({ id: "def" }), card({ id: "ex", tipo: "EXEMPLO" })];
    expect(filterAndSortBaralhoCards(cards, criteria({ tipo: "EXEMPLO" })).map((c) => c.id)).toEqual([
      "ex",
    ]);
  });

  it("filters by the subject of a connected concept", () => {
    const cards = [
      card({ id: "bio", conceitosConectados: [tag({ assuntoId: "a1" })] }),
      card({ id: "qui", conceitosConectados: [tag({ assuntoId: "a2" })] }),
      card({ id: "solto" }),
    ];
    expect(filterAndSortBaralhoCards(cards, criteria({ assuntoId: "a1" })).map((c) => c.id)).toEqual([
      "bio",
    ]);
  });

  it("filters by the topic of a connected concept", () => {
    const cards = [
      card({ id: "cel", conceitosConectados: [tag({ topicoId: "t1" })] }),
      card({ id: "gen", conceitosConectados: [tag({ topicoId: "t2" })] }),
    ];
    expect(filterAndSortBaralhoCards(cards, criteria({ topicoId: "t1" })).map((c) => c.id)).toEqual([
      "cel",
    ]);
  });

  it("filters by a connected concept name", () => {
    const cards = [
      card({ id: "foto", conceitosConectados: [tag({ conceito: "Fotossintese" })] }),
      card({ id: "alelo", conceitosConectados: [tag({ conceito: "Alelos" })] }),
    ];
    expect(filterAndSortBaralhoCards(cards, criteria({ conceito: "Alelos" })).map((c) => c.id)).toEqual(
      ["alelo"],
    );
  });

  it("matches a card connected to several concepts by any of them", () => {
    const cards = [
      card({
        id: "multi",
        conceitosConectados: [tag({ conceito: "Alelos", assuntoId: "a1" }), tag({ conceito: "Genes", assuntoId: "a9" })],
      }),
    ];
    expect(filterAndSortBaralhoCards(cards, criteria({ assuntoId: "a9" })).map((c) => c.id)).toEqual([
      "multi",
    ]);
  });

  it("keeps the given order by default (the deck order)", () => {
    const cards = [card({ id: "z", conceito: "Zeta" }), card({ id: "a", conceito: "Alpha" })];
    expect(filterAndSortBaralhoCards(cards, DEFAULTS).map((c) => c.id)).toEqual(["z", "a"]);
  });

  it("sorts alphabetically by concept", () => {
    const cards = [card({ id: "z", conceito: "Zeta" }), card({ id: "a", conceito: "Alpha" })];
    expect(filterAndSortBaralhoCards(cards, criteria({ sortBy: "conceito" })).map((c) => c.id)).toEqual(
      ["a", "z"],
    );
  });

  it("sorts by tipo", () => {
    const cards = [card({ id: "ex", tipo: "EXEMPLO" }), card({ id: "def", tipo: "DEFINICAO" })];
    expect(filterAndSortBaralhoCards(cards, criteria({ sortBy: "tipo" })).map((c) => c.id)).toEqual([
      "def",
      "ex",
    ]);
  });

  it("does not mutate the given list", () => {
    const cards = [card({ id: "z", conceito: "Zeta" }), card({ id: "a", conceito: "Alpha" })];
    filterAndSortBaralhoCards(cards, criteria({ sortBy: "conceito" }));
    expect(cards.map((c) => c.id)).toEqual(["z", "a"]);
  });
});

describe("cardTipoOptions", () => {
  it("offers only the tipos present in the deck, sorted", () => {
    const cards = [card({ tipo: "EXEMPLO" }), card({ tipo: "DEFINICAO" }), card({ tipo: "EXEMPLO" })];
    expect(cardTipoOptions(cards)).toEqual(["DEFINICAO", "EXEMPLO"]);
  });

  it("ignores cards without a tipo", () => {
    expect(cardTipoOptions([card({ tipo: null })])).toEqual([]);
  });
});

describe("cardTagOptions", () => {
  it("lists the distinct subjects, topics and concepts of the deck, sorted by name", () => {
    const cards = [
      card({ conceitosConectados: [tag({ conceito: "Zeta", topico: "T2", topicoId: "t2" })] }),
      card({ conceitosConectados: [tag({ conceito: "Alpha" })] }),
    ];
    const options = cardTagOptions(cards);
    expect(options.assuntos).toEqual([{ id: "a1", nome: "Biologia" }]);
    expect(options.topicos).toEqual([
      { id: "t1", nome: "Celula", assuntoId: "a1" },
      { id: "t2", nome: "T2", assuntoId: "a1" },
    ]);
    expect(options.conceitos).toEqual(["Alpha", "Zeta"]);
  });

  it("has no options when no card is connected in a graph", () => {
    expect(cardTagOptions([card()])).toEqual({ assuntos: [], topicos: [], conceitos: [] });
  });
});

describe("countActiveCardFilters", () => {
  it("counts nothing by default", () => {
    expect(countActiveCardFilters(DEFAULTS)).toBe(0);
  });

  it("counts each non-default filter", () => {
    expect(
      countActiveCardFilters(criteria({ tipo: "EXEMPLO", assuntoId: "a1", sortBy: "conceito" })),
    ).toBe(3);
  });

  it("does not count the search box, which is visible on its own", () => {
    expect(countActiveCardFilters(criteria({ search: "foto" }))).toBe(0);
  });
});

describe("formatTipoLabel", () => {
  it("turns the enum into readable text", () => {
    expect(formatTipoLabel("ERRO_COMUM")).toBe("erro comum");
  });
});
