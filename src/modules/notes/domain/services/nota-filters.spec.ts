import { describe, it, expect } from "vitest";
import {
  getTimeBucket,
  filterAndSortNotas,
  computeNotesStats,
  countActiveFilters,
  type NotesFilterCriteria,
} from "./nota-filters";
import type { NotaListItem } from "../nota.types";

const NOW = new Date("2026-01-10T12:00:00Z");

function nota(over: Partial<NotaListItem>): NotaListItem {
  return {
    id: "n", titulo: "T", preview: "p", dataCriacao: NOW,
    conceitosRelacionados: [], flashcardCount: 0, wordCount: 10,
    subtipo: null, tipoNota: "NOTA", ...over,
  };
}

const DEFAULTS: NotesFilterCriteria = {
  search: "", conceptFilter: "", timeFilter: "all", fcFilter: "all", sortBy: "date-desc",
};

describe("getTimeBucket", () => {
  it("buckets by age relative to now", () => {
    expect(getTimeBucket(new Date("2026-01-10T06:00:00Z"), NOW)).toBe("today");
    expect(getTimeBucket(new Date("2026-01-07T12:00:00Z"), NOW)).toBe("week");
    expect(getTimeBucket(new Date("2025-12-25T12:00:00Z"), NOW)).toBe("month");
    expect(getTimeBucket(new Date("2025-10-01T12:00:00Z"), NOW)).toBe("older");
  });
});

describe("filterAndSortNotas", () => {
  const a = nota({ id: "a", titulo: "Alpha", wordCount: 5, flashcardCount: 2, dataCriacao: new Date("2026-01-09T12:00:00Z") });
  const b = nota({ id: "b", titulo: "Beta", wordCount: 30, flashcardCount: 0, dataCriacao: new Date("2026-01-10T11:00:00Z") });

  it("searches title/preview case-insensitively", () => {
    expect(filterAndSortNotas([a, b], { ...DEFAULTS, search: "alph" }, NOW).map((n) => n.id)).toEqual(["a"]);
  });

  it("filters by flashcard presence", () => {
    expect(filterAndSortNotas([a, b], { ...DEFAULTS, fcFilter: "no-fc" }, NOW).map((n) => n.id)).toEqual(["b"]);
  });

  it("sorts by words desc", () => {
    expect(filterAndSortNotas([a, b], { ...DEFAULTS, sortBy: "words-desc" }, NOW).map((n) => n.id)).toEqual(["b", "a"]);
  });

  it("defaults to most-recent first", () => {
    expect(filterAndSortNotas([a, b], DEFAULTS, NOW).map((n) => n.id)).toEqual(["b", "a"]);
  });
});

describe("computeNotesStats", () => {
  it("aggregates counters and unique concepts", () => {
    const notas = [
      nota({ flashcardCount: 1, wordCount: 10, conceitosRelacionados: [{ id: "c1", nome: "x" }] }),
      nota({ flashcardCount: 0, wordCount: 20, conceitosRelacionados: [{ id: "c1", nome: "x" }, { id: "c2", nome: "y" }] }),
    ];
    expect(computeNotesStats(notas)).toEqual({ total: 2, withFc: 1, noFc: 1, totalWords: 30, conceptCount: 2 });
  });
});

describe("countActiveFilters", () => {
  it("counts non-default filters", () => {
    expect(countActiveFilters(DEFAULTS)).toBe(0);
    expect(countActiveFilters({ ...DEFAULTS, conceptFilter: "c1", sortBy: "alpha" })).toBe(2);
  });
});
