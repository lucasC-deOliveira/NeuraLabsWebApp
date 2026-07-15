import { describe, it, expect } from "vitest";
import {
  filterAndSortProvaQuestoes,
  provaQuestaoTipoOptions,
  provaQuestaoTagOptions,
  countActiveProvaQuestaoFilters,
  DEFAULT_PROVA_QUESTAO_CRITERIA,
  type ProvaQuestaoCriteria,
} from "./prova-questao-filters";
import type { ProvaConceptTag, ProvaQuestaoItem } from "../prova.types";

const tag = (over: Partial<ProvaConceptTag> = {}): ProvaConceptTag => ({
  conceito: "Fotossintese",
  topico: "Metabolismo",
  topicoId: "t1",
  assunto: "Biologia",
  assuntoId: "a1",
  ...over,
});

const questao = (over: Partial<ProvaQuestaoItem> = {}): ProvaQuestaoItem => ({
  ordem: 0,
  id: "q1",
  tipo: "MULTIPLA_ESCOLHA",
  enunciado: "O que a planta faz com a luz?",
  alternativas: [{ letra: "A", texto: "Fotossintese" }],
  gabarito: "A",
  explicacao: null,
  conceitoNome: null,
  conceitosConectados: [tag()],
  ...over,
});

const criteria = (over: Partial<ProvaQuestaoCriteria> = {}): ProvaQuestaoCriteria => ({
  ...DEFAULT_PROVA_QUESTAO_CRITERIA,
  ...over,
});

describe("filterAndSortProvaQuestoes", () => {
  it("keeps every question when nothing is filtered", () => {
    const questoes = [questao(), questao({ id: "q2", ordem: 1 })];
    expect(filterAndSortProvaQuestoes(questoes, criteria())).toHaveLength(2);
  });

  // A ordem da prova é a ordem da prova: a questão 1 vem antes da 2, sempre.
  it("opens in the exam's own order, not by recency", () => {
    const questoes = [
      questao({ id: "q3", ordem: 2, enunciado: "C" }),
      questao({ id: "q1", ordem: 0, enunciado: "A" }),
      questao({ id: "q2", ordem: 1, enunciado: "B" }),
    ];
    const ordenadas = filterAndSortProvaQuestoes(questoes, criteria());
    expect(ordenadas.map((q) => q.ordem)).toEqual([0, 1, 2]);
  });

  it("sorts by enunciado when asked", () => {
    const questoes = [
      questao({ id: "q1", ordem: 0, enunciado: "Zebra" }),
      questao({ id: "q2", ordem: 1, enunciado: "Abelha" }),
    ];
    const ordenadas = filterAndSortProvaQuestoes(questoes, criteria({ sortBy: "enunciado" }));
    expect(ordenadas.map((q) => q.enunciado)).toEqual(["Abelha", "Zebra"]);
  });

  it("does not mutate the given list", () => {
    const questoes = [questao({ id: "q2", ordem: 1 }), questao({ id: "q1", ordem: 0 })];
    filterAndSortProvaQuestoes(questoes, criteria());
    expect(questoes[0].id).toBe("q2");
  });

  it("filters by tipo", () => {
    const questoes = [questao(), questao({ id: "q2", ordem: 1, tipo: "VERDADEIRO_FALSO" })];
    const vf = filterAndSortProvaQuestoes(questoes, criteria({ tipo: "VERDADEIRO_FALSO" }));
    expect(vf.map((q) => q.id)).toEqual(["q2"]);
  });

  describe("search", () => {
    it("finds by enunciado", () => {
      const questoes = [questao(), questao({ id: "q2", ordem: 1, enunciado: "Outra coisa" })];
      expect(filterAndSortProvaQuestoes(questoes, criteria({ search: "planta" }))).toHaveLength(1);
    });

    it("finds by alternativa, explicação and tag — tudo que a questão mostra", () => {
      const questoes = [questao({ explicacao: "Clorofila absorve luz" })];
      expect(filterAndSortProvaQuestoes(questoes, criteria({ search: "clorofila" }))).toHaveLength(1);
      expect(filterAndSortProvaQuestoes(questoes, criteria({ search: "fotossintese" }))).toHaveLength(1);
      expect(filterAndSortProvaQuestoes(questoes, criteria({ search: "biologia" }))).toHaveLength(1);
    });

    it("ignores case and surrounding spaces", () => {
      expect(filterAndSortProvaQuestoes([questao()], criteria({ search: "  PLANTA " }))).toHaveLength(1);
    });
  });

  describe("concept tags", () => {
    const outra = questao({
      id: "q2",
      ordem: 1,
      conceitosConectados: [
        tag({ conceito: "Mitose", topico: "Celula", topicoId: "t2", assunto: "Biologia" }),
      ],
    });

    it("filters by assunto, tópico and conceito", () => {
      const questoes = [questao(), outra];
      expect(filterAndSortProvaQuestoes(questoes, criteria({ topicoId: "t2" })).map((q) => q.id)).toEqual(["q2"]);
      expect(filterAndSortProvaQuestoes(questoes, criteria({ conceito: "Fotossintese" })).map((q) => q.id)).toEqual(["q1"]);
      expect(filterAndSortProvaQuestoes(questoes, criteria({ assuntoId: "a1" }))).toHaveLength(2);
    });

    it("keeps a question with no tags out of any tag filter, instead of crashing", () => {
      const semTag = questao({ id: "q3", ordem: 2, conceitosConectados: [] });
      expect(filterAndSortProvaQuestoes([semTag], criteria({ assuntoId: "a1" }))).toHaveLength(0);
      expect(filterAndSortProvaQuestoes([semTag], criteria())).toHaveLength(1);
    });
  });
});

describe("provaQuestaoTipoOptions", () => {
  it("offers only the tipos present in the exam", () => {
    expect(provaQuestaoTipoOptions([questao()])).toEqual(["MULTIPLA_ESCOLHA"]);
  });

  it("does not repeat a tipo", () => {
    expect(provaQuestaoTipoOptions([questao(), questao({ id: "q2" })])).toHaveLength(1);
  });
});

describe("provaQuestaoTagOptions", () => {
  it("collects the levels present in the exam's tags", () => {
    const options = provaQuestaoTagOptions([questao()]);
    expect(options.assuntos).toEqual([{ id: "a1", nome: "Biologia" }]);
    expect(options.conceitos).toEqual(["Fotossintese"]);
  });
});

describe("countActiveProvaQuestaoFilters", () => {
  it("counts nothing by default", () => {
    expect(countActiveProvaQuestaoFilters(DEFAULT_PROVA_QUESTAO_CRITERIA)).toBe(0);
  });

  // A busca não conta: já está visível no campo, ao lado do rótulo.
  it("ignores the search box", () => {
    expect(countActiveProvaQuestaoFilters(criteria({ search: "planta" }))).toBe(0);
  });

  it("counts each active filter, including a sort away from the exam order", () => {
    expect(countActiveProvaQuestaoFilters(criteria({ tipo: "VERDADEIRO_FALSO" }))).toBe(1);
    expect(countActiveProvaQuestaoFilters(criteria({ assuntoId: "a1", conceito: "Mitose" }))).toBe(2);
    expect(countActiveProvaQuestaoFilters(criteria({ sortBy: "enunciado" }))).toBe(1);
  });
});
