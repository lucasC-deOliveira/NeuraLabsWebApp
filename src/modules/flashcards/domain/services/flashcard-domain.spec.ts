import { describe, it, expect } from "vitest";
import { formatDistanceToNow, isOverdue, isDue, getEaseBar } from "./srs-status";
import { filterAndSortFlashcards, computeFlashcardStats, countActiveFilters, type FlashcardCriteria } from "./flashcard-filters";
import { flattenConceptOptions } from "./concept-options";
import type { FlashcardConceptTag, FlashcardItem, SpacedRepetition } from "../flashcard.types";

const NOW = new Date("2026-01-10T12:00:00Z");

function sr(over: Partial<SpacedRepetition>): SpacedRepetition {
  return { dificuldade: 3, intervalo: 5, proximaRevisao: NOW, ultimaRevisao: NOW, estagioAprendizado: 2, ...over };
}
function card(over: Partial<FlashcardItem>): FlashcardItem {
  return {
    id: "c", tipo: null, pergunta: "p", resposta: "r", conceito: "Concept", topico: "T", topicoId: "t1",
    assunto: "A", assuntoId: "a1", conceitosConectados: [], dataCriacao: NOW, spacedRepetition: null, ...over,
  };
}
function tag(over: Partial<FlashcardConceptTag>): FlashcardConceptTag {
  return { conceito: "Fotossintese", topico: "Celula", topicoId: "t9", assunto: "Biologia", assuntoId: "a9", ...over };
}

describe("srs-status", () => {
  it("formats relative time with overdue severity", () => {
    expect(formatDistanceToNow(new Date("2026-01-05T12:00:00Z"), NOW)).toEqual({ text: "Atrasado 5d", severe: true });
    expect(formatDistanceToNow(new Date("2026-01-10T18:00:00Z"), NOW)).toEqual({ text: "6h", severe: false });
  });
  it("computes overdue/due", () => {
    expect(isOverdue(sr({ proximaRevisao: new Date("2026-01-09T12:00:00Z") }), NOW)).toBe(true);
    expect(isDue(sr({ proximaRevisao: new Date("2026-01-10T18:00:00Z") }), NOW)).toBe(true);
    expect(isDue(sr({ proximaRevisao: new Date("2026-01-20T12:00:00Z") }), NOW)).toBe(false);
  });
  it("builds the ease bar clamped 1..5", () => {
    expect(getEaseBar(3)).toEqual([true, true, true, false, false]);
    expect(getEaseBar(9)).toEqual([true, true, true, true, true]);
  });
});

const DEFAULTS: FlashcardCriteria = { search: "", assuntoFilter: "", topicoFilter: "", tipoFilter: "", statusFilter: "all", sortBy: "date" };

describe("filterAndSortFlashcards", () => {
  const overdue = card({ id: "o", conceito: "Zeta", spacedRepetition: sr({ proximaRevisao: new Date("2026-01-01T12:00:00Z"), estagioAprendizado: 3 }) });
  const fresh = card({ id: "n", conceito: "Alpha", spacedRepetition: null });

  it("filters by status overdue", () => {
    expect(filterAndSortFlashcards([overdue, fresh], { ...DEFAULTS, statusFilter: "overdue" }, NOW).map((c) => c.id)).toEqual(["o"]);
  });
  it("filters new (no SRS)", () => {
    expect(filterAndSortFlashcards([overdue, fresh], { ...DEFAULTS, statusFilter: "new" }, NOW).map((c) => c.id)).toEqual(["n"]);
  });
  it("sorts alpha by concept", () => {
    expect(filterAndSortFlashcards([overdue, fresh], { ...DEFAULTS, sortBy: "alpha" }, NOW).map((c) => c.id)).toEqual(["n", "o"]);
  });
  it("filters by tipo", () => {
    const definicao = card({ id: "d", tipo: "DEFINICAO" });
    const exemplo = card({ id: "e", tipo: "EXEMPLO" });
    expect(filterAndSortFlashcards([definicao, exemplo], { ...DEFAULTS, tipoFilter: "EXEMPLO" }, NOW).map((c) => c.id)).toEqual(["e"]);
  });
});

// As tags exibidas no card vêm dos conceitos conectados no grafo; filtrar por uma
// tag visível tem de encontrar o card, mesmo que o conceito base seja outro.
describe("filterAndSortFlashcards with graph-connected concepts", () => {
  const linked = card({ id: "g", assuntoId: "a1", topicoId: "t1", conceitosConectados: [tag({})] });

  it("matches the subject of a connected concept, not only the base one", () => {
    expect(filterAndSortFlashcards([linked], { ...DEFAULTS, assuntoFilter: "a9" }, NOW).map((c) => c.id)).toEqual(["g"]);
  });
  it("matches the topic of a connected concept", () => {
    expect(filterAndSortFlashcards([linked], { ...DEFAULTS, topicoFilter: "t9" }, NOW).map((c) => c.id)).toEqual(["g"]);
  });
  it("still matches the base subject of the flashcard", () => {
    expect(filterAndSortFlashcards([linked], { ...DEFAULTS, assuntoFilter: "a1" }, NOW).map((c) => c.id)).toEqual(["g"]);
  });
  it("excludes cards connected to no matching concept", () => {
    expect(filterAndSortFlashcards([linked], { ...DEFAULTS, assuntoFilter: "other" }, NOW)).toEqual([]);
  });
  it("searches the text of connected concepts", () => {
    expect(filterAndSortFlashcards([linked], { ...DEFAULTS, search: "fotossint" }, NOW).map((c) => c.id)).toEqual(["g"]);
  });
});

describe("computeFlashcardStats", () => {
  it("counts overdue, due, mastered and new", () => {
    const cards = [
      card({ spacedRepetition: null }),
      card({ spacedRepetition: sr({ estagioAprendizado: 5 }) }),
      card({ spacedRepetition: sr({ proximaRevisao: new Date("2026-01-01T12:00:00Z"), estagioAprendizado: 3 }) }),
    ];
    expect(computeFlashcardStats(cards, NOW)).toEqual({ total: 3, due: 1, overdue: 1, mastered: 1, newCount: 1 });
  });
});

describe("countActiveFilters", () => {
  it("counts non-default filters", () => {
    expect(countActiveFilters(DEFAULTS)).toBe(0);
    expect(countActiveFilters({ ...DEFAULTS, assuntoFilter: "a1", sortBy: "alpha" })).toBe(2);
  });
  it("counts the tipo filter", () => {
    expect(countActiveFilters({ ...DEFAULTS, tipoFilter: "DEFINICAO" })).toBe(1);
  });
});

describe("flattenConceptOptions", () => {
  it("flattens and sorts concepts by name", () => {
    const opts = flattenConceptOptions([
      { id: "s1", nome: "Bio", topicos: [{ id: "t1", nome: "Cel", conceitos: [{ id: "c2", nome: "Zeta" }, { id: "c1", nome: "Alpha" }] }] },
    ]);
    expect(opts.map((o) => o.nome)).toEqual(["Alpha", "Zeta"]);
    expect(opts[0]).toMatchObject({ id: "c1", topicoNome: "Cel", assuntoNome: "Bio" });
  });
});
