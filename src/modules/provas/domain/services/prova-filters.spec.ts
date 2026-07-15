import { describe, it, expect } from "vitest";
import {
  filterAndSortProvas,
  countActiveProvaFilters,
  DEFAULT_PROVA_CRITERIA,
  type ProvaCriteria,
} from "./prova-filters";
import type { ProvaListItem } from "../prova.types";

const prova = (over: Partial<ProvaListItem> = {}): ProvaListItem => ({
  id: "p1",
  titulo: "Enem 2025",
  descricao: "Segundo dia",
  totalQuestoes: 90,
  dataCriacao: "2026-07-01T12:00:00.000Z",
  ...over,
});

const criteria = (over: Partial<ProvaCriteria> = {}): ProvaCriteria => ({
  ...DEFAULT_PROVA_CRITERIA,
  ...over,
});

describe("filterAndSortProvas", () => {
  it("keeps every exam when nothing is filtered", () => {
    expect(filterAndSortProvas([prova(), prova({ id: "p2" })], criteria())).toHaveLength(2);
  });

  it("does not mutate the given list", () => {
    const provas = [prova({ id: "p1", titulo: "Zebra" }), prova({ id: "p2", titulo: "Abelha" })];
    filterAndSortProvas(provas, criteria({ sortBy: "alfabetica" }));
    expect(provas[0].id).toBe("p1");
  });

  describe("search", () => {
    it("finds by título", () => {
      const provas = [prova(), prova({ id: "p2", titulo: "Serpro 2023", descricao: null })];
      expect(filterAndSortProvas(provas, criteria({ search: "serpro" })).map((p) => p.id)).toEqual(["p2"]);
    });

    // A descrição aparece na linha da prova; quem a lê espera poder buscá-la.
    it("finds by descrição", () => {
      const provas = [prova(), prova({ id: "p2", titulo: "Serpro", descricao: "Bloco 2" })];
      expect(filterAndSortProvas(provas, criteria({ search: "bloco" })).map((p) => p.id)).toEqual(["p2"]);
    });

    it("ignores case and surrounding spaces", () => {
      expect(filterAndSortProvas([prova()], criteria({ search: "  ENEM " }))).toHaveLength(1);
    });

    it("survives an exam with no descrição, instead of crashing", () => {
      expect(filterAndSortProvas([prova({ descricao: null })], criteria({ search: "enem" }))).toHaveLength(1);
    });
  });

  describe("sort", () => {
    const antiga = prova({ id: "p1", titulo: "Zebra", totalQuestoes: 10, dataCriacao: "2026-01-01T00:00:00.000Z" });
    const nova = prova({ id: "p2", titulo: "Abelha", totalQuestoes: 120, dataCriacao: "2026-07-01T00:00:00.000Z" });

    it("opens with the newest first", () => {
      expect(filterAndSortProvas([antiga, nova], criteria()).map((p) => p.id)).toEqual(["p2", "p1"]);
    });

    it("sorts alphabetically", () => {
      expect(filterAndSortProvas([antiga, nova], criteria({ sortBy: "alfabetica" })).map((p) => p.titulo)).toEqual([
        "Abelha",
        "Zebra",
      ]);
    });

    it("sorts by size, biggest exam first", () => {
      expect(filterAndSortProvas([antiga, nova], criteria({ sortBy: "questoes" })).map((p) => p.totalQuestoes)).toEqual([
        120, 10,
      ]);
    });
  });
});

describe("countActiveProvaFilters", () => {
  it("counts nothing by default", () => {
    expect(countActiveProvaFilters(DEFAULT_PROVA_CRITERIA)).toBe(0);
  });

  // A busca não conta: já está visível no campo, ao lado do rótulo.
  it("ignores the search box", () => {
    expect(countActiveProvaFilters(criteria({ search: "enem" }))).toBe(0);
  });

  it("counts a sort away from the default", () => {
    expect(countActiveProvaFilters(criteria({ sortBy: "questoes" }))).toBe(1);
  });
});
