import { describe, it, expect } from "vitest";
import {
  filterAndSortQuestoes,
  questaoTipoOptions,
  questaoTagOptions,
  countActiveQuestaoFilters,
  DEFAULT_QUESTAO_CRITERIA as DEFAULTS,
  type QuestaoCriteria,
} from "./questao-filters";
import type { QuestaoConceptTag, QuestaoListItem } from "../questao.types";

function tag(over: Partial<QuestaoConceptTag> = {}): QuestaoConceptTag {
  return {
    conceito: "Cache",
    topico: "Memória",
    topicoId: "t1",
    assunto: "Computação",
    assuntoId: "a1",
    ...over,
  };
}

function questao(over: Partial<QuestaoListItem> = {}): QuestaoListItem {
  return {
    id: "q1",
    tipo: "MULTIPLA_ESCOLHA",
    enunciado: "O que é cache?",
    gabarito: "A",
    explicacao: null,
    alternativas: null,
    conceitoId: null,
    conceitoNome: null,
    conceitosConectados: [],
    dataCriacao: "2026-01-10T12:00:00.000Z",
    ...over,
  };
}

const criteria = (over: Partial<QuestaoCriteria> = {}): QuestaoCriteria => ({ ...DEFAULTS, ...over });

describe("filterAndSortQuestoes", () => {
  it("keeps every question by default", () => {
    expect(filterAndSortQuestoes([questao({ id: "a" }), questao({ id: "b" })], DEFAULTS)).toHaveLength(2);
  });

  it("searches the statement, ignoring case", () => {
    const items = [questao({ id: "cache" }), questao({ id: "outro", enunciado: "Defina pilha" })];
    expect(filterAndSortQuestoes(items, criteria({ search: "CACHE" })).map((q) => q.id)).toEqual(["cache"]);
  });

  it("searches the explanation and the alternatives", () => {
    const items = [
      questao({ id: "exp", enunciado: "x", explicacao: "sobre mitocondria" }),
      questao({ id: "alt", enunciado: "y", alternativas: [{ letra: "A", texto: "mitocondria" }] }),
      questao({ id: "fora", enunciado: "z" }),
    ];
    const ids = filterAndSortQuestoes(items, criteria({ search: "mitoc" })).map((q) => q.id);
    expect(ids.sort()).toEqual(["alt", "exp"]);
  });

  it("searches the connected concept tags", () => {
    const items = [
      questao({ id: "tagged", enunciado: "x", conceitosConectados: [tag({ conceito: "Alelos" })] }),
      questao({ id: "outra", enunciado: "y" }),
    ];
    expect(filterAndSortQuestoes(items, criteria({ search: "alelos" })).map((q) => q.id)).toEqual(["tagged"]);
  });

  it("filters by tipo", () => {
    const items = [questao({ id: "me" }), questao({ id: "vf", tipo: "VERDADEIRO_FALSO" })];
    expect(filterAndSortQuestoes(items, criteria({ tipo: "VERDADEIRO_FALSO" })).map((q) => q.id)).toEqual(["vf"]);
  });

  it("filters by the subject, topic and concept of the graph tags", () => {
    const items = [
      questao({ id: "comp", conceitosConectados: [tag()] }),
      questao({ id: "bio", conceitosConectados: [tag({ assuntoId: "a2", topicoId: "t2", conceito: "Alelos" })] }),
    ];
    expect(filterAndSortQuestoes(items, criteria({ assuntoId: "a1" })).map((q) => q.id)).toEqual(["comp"]);
    expect(filterAndSortQuestoes(items, criteria({ topicoId: "t2" })).map((q) => q.id)).toEqual(["bio"]);
    expect(filterAndSortQuestoes(items, criteria({ conceito: "Alelos" })).map((q) => q.id)).toEqual(["bio"]);
  });

  it("sorts by most recent by default", () => {
    const items = [
      questao({ id: "old", dataCriacao: "2026-01-01T12:00:00.000Z" }),
      questao({ id: "new", dataCriacao: "2026-02-01T12:00:00.000Z" }),
    ];
    expect(filterAndSortQuestoes(items, DEFAULTS).map((q) => q.id)).toEqual(["new", "old"]);
  });

  it("sorts alphabetically by statement", () => {
    const items = [questao({ id: "z", enunciado: "Zebra" }), questao({ id: "a", enunciado: "Abelha" })];
    expect(filterAndSortQuestoes(items, criteria({ sortBy: "enunciado" })).map((q) => q.id)).toEqual(["a", "z"]);
  });

  it("does not mutate the given list", () => {
    const items = [questao({ id: "z", enunciado: "Zebra" }), questao({ id: "a", enunciado: "Abelha" })];
    filterAndSortQuestoes(items, criteria({ sortBy: "enunciado" }));
    expect(items.map((q) => q.id)).toEqual(["z", "a"]);
  });
});

describe("questaoTipoOptions", () => {
  it("offers only the tipos present in the list", () => {
    expect(questaoTipoOptions([questao(), questao({ tipo: "VERDADEIRO_FALSO" })])).toEqual([
      "MULTIPLA_ESCOLHA",
      "VERDADEIRO_FALSO",
    ]);
    expect(questaoTipoOptions([questao()])).toEqual(["MULTIPLA_ESCOLHA"]);
  });

  it("has no options for an empty list", () => {
    expect(questaoTipoOptions([])).toEqual([]);
  });
});

describe("questaoTagOptions", () => {
  it("lists the levels present in the questions", () => {
    const options = questaoTagOptions([questao({ conceitosConectados: [tag()] })]);
    expect(options.assuntos).toEqual([{ id: "a1", nome: "Computação" }]);
    expect(options.conceitos).toEqual(["Cache"]);
  });

  it("has no options when no question is tagged", () => {
    expect(questaoTagOptions([questao()])).toEqual({ assuntos: [], topicos: [], conceitos: [] });
  });
});

describe("countActiveQuestaoFilters", () => {
  it("counts nothing by default", () => {
    expect(countActiveQuestaoFilters(DEFAULTS)).toBe(0);
  });

  it("counts each non-default filter, but not the search box", () => {
    expect(countActiveQuestaoFilters(criteria({ tipo: "VERDADEIRO_FALSO", assuntoId: "a1" }))).toBe(2);
    expect(countActiveQuestaoFilters(criteria({ search: "cache" }))).toBe(0);
  });
});
