import { describe, it, expect } from "vitest";
import {
  filterGraphNodes,
  computeDegreeMap,
  countActiveFilters,
  PRIORITY_MAX,
  type GraphSearchFilters,
} from "./useGraphSearch";

const DEFAULT: GraphSearchFilters = {
  query: "",
  textScope: "all",
  types: new Set(),
  domainMin: 0,
  domainMax: 100,
  priorityMin: 0,
  priorityMax: PRIORITY_MAX,
  degree: "all",
};
const f = (patch: Partial<GraphSearchFilters>): GraphSearchFilters => ({ ...DEFAULT, ...patch });

const node = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  label: id,
  group: "CONCEITO",
  dominio: 0.5,
  prioridadeRevisao: 5,
  ...extra,
});

const ids = (arr: { id: string }[]) => arr.map((n) => n.id).sort();

describe("computeDegreeMap", () => {
  it("conta o grau (nº de relações) de cada nó", () => {
    const m = computeDegreeMap([
      { source: "a", target: "b" },
      { source: "a", target: "c" },
      { source: "b", target: "c" },
    ]);
    expect(m.get("a")).toBe(2);
    expect(m.get("b")).toBe(2);
    expect(m.get("c")).toBe(2);
  });

  it("nó sem arestas não aparece no mapa", () => {
    const m = computeDegreeMap([{ source: "a", target: "b" }]);
    expect(m.get("solto")).toBeUndefined();
  });
});

describe("countActiveFilters", () => {
  it("zero quando tudo no padrão", () => {
    expect(countActiveFilters(DEFAULT)).toBe(0);
  });

  it("soma cada critério ativo", () => {
    expect(countActiveFilters(f({ query: "x" }))).toBe(1);
    expect(countActiveFilters(f({ types: new Set(["NOTA"]) }))).toBe(1);
    expect(countActiveFilters(f({ domainMin: 30 }))).toBe(1);
    expect(countActiveFilters(f({ priorityMax: 7 }))).toBe(1);
    expect(countActiveFilters(f({ degree: "hub" }))).toBe(1);
    expect(
      countActiveFilters(f({ query: "x", types: new Set(["NOTA"]), domainMax: 80, degree: "leaf" })),
    ).toBe(4);
  });

  it("espaços em branco na query não contam", () => {
    expect(countActiveFilters(f({ query: "   " }))).toBe(0);
  });
});

describe("filterGraphNodes — texto", () => {
  const nodes = [
    node("a", { label: "Teorema de Bayes" }),
    node("b", { label: "Cadeia de Markov", pergunta: "o que é bayes?" }),
    node("c", { label: "Regressão" }),
  ];

  it("casa no rótulo (case-insensitive)", () => {
    expect(ids(filterGraphNodes(nodes, [], f({ query: "bayes" })))).toEqual(["a", "b"]);
  });

  it("casa também na pergunta do flashcard", () => {
    const out = filterGraphNodes(nodes, [], f({ query: "markov" }));
    expect(ids(out)).toEqual(["b"]);
  });

  it("query vazia não filtra por texto", () => {
    expect(filterGraphNodes(nodes, [], f({ query: "" }))).toHaveLength(3);
  });
});

describe("filterGraphNodes — escopo do texto (título vs conteúdo)", () => {
  const nodes = [
    node("titulo", { label: "Bayes" }), // casa no título
    node("corpo", { label: "Regressão" }), // só casa por conteúdo (vem do servidor)
    node("flash", { label: "FC", pergunta: "o que é bayes?" }), // pergunta = título
  ];
  // o servidor disse que só "corpo" casa no conteúdo
  const contentMatch = new Set(["corpo"]);

  it("escopo 'all' casa em título OU conteúdo", () => {
    const out = filterGraphNodes(nodes, [], f({ query: "bayes", textScope: "all" }), contentMatch);
    expect(ids(out)).toEqual(["corpo", "flash", "titulo"]);
  });

  it("escopo 'title' casa só no rótulo/pergunta (ignora o conteúdo do servidor)", () => {
    const out = filterGraphNodes(nodes, [], f({ query: "bayes", textScope: "title" }), contentMatch);
    expect(ids(out)).toEqual(["flash", "titulo"]);
  });

  it("escopo 'content' casa só nos ids vindos do servidor", () => {
    const out = filterGraphNodes(nodes, [], f({ query: "bayes", textScope: "content" }), contentMatch);
    expect(ids(out)).toEqual(["corpo"]);
  });

  it("escopo 'content' sem resultado do servidor (null) não casa nada", () => {
    const out = filterGraphNodes(nodes, [], f({ query: "bayes", textScope: "content" }), null);
    expect(out).toHaveLength(0);
  });
});

describe("filterGraphNodes — tipo", () => {
  const nodes = [node("a", { group: "NOTA" }), node("b", { group: "CONCEITO" }), node("c", { group: "FLASHCARD" })];

  it("conjunto vazio = todos os tipos", () => {
    expect(filterGraphNodes(nodes, [], f({ types: new Set() }))).toHaveLength(3);
  });

  it("inclui só os tipos selecionados (multi)", () => {
    expect(ids(filterGraphNodes(nodes, [], f({ types: new Set(["NOTA", "FLASHCARD"]) })))).toEqual([
      "a",
      "c",
    ]);
  });
});

describe("filterGraphNodes — domínio e prioridade", () => {
  const nodes = [
    node("fraco", { dominio: 0.1, prioridadeRevisao: 9 }),
    node("medio", { dominio: 0.5, prioridadeRevisao: 5 }),
    node("forte", { dominio: 0.9, prioridadeRevisao: 1 }),
  ];

  it("faixa de domínio (em %)", () => {
    expect(ids(filterGraphNodes(nodes, [], f({ domainMax: 30 })))).toEqual(["fraco"]);
    expect(ids(filterGraphNodes(nodes, [], f({ domainMin: 60 })))).toEqual(["forte"]);
    expect(ids(filterGraphNodes(nodes, [], f({ domainMin: 40, domainMax: 60 })))).toEqual(["medio"]);
  });

  it("faixa de prioridade de revisão", () => {
    expect(ids(filterGraphNodes(nodes, [], f({ priorityMin: 8 })))).toEqual(["fraco"]);
    expect(ids(filterGraphNodes(nodes, [], f({ priorityMax: 3 })))).toEqual(["forte"]);
  });
});

describe("filterGraphNodes — grau de conexões", () => {
  // a(grau3=hub-ish), b(2), c(1=folha), solto(0)
  const nodes = [node("a"), node("b"), node("c"), node("solto"), node("d"), node("e")];
  const edges = [
    { source: "a", target: "b" },
    { source: "a", target: "c" },
    { source: "a", target: "d" },
    { source: "a", target: "e" },
    { source: "b", target: "d" },
  ];

  it("isolados: grau 0", () => {
    expect(ids(filterGraphNodes(nodes, edges, f({ degree: "isolated" })))).toEqual(["solto"]);
  });

  it("folhas: grau exatamente 1", () => {
    expect(ids(filterGraphNodes(nodes, edges, f({ degree: "leaf" })))).toEqual(["c", "e"]);
  });

  it("hubs: grau >= 4", () => {
    expect(ids(filterGraphNodes(nodes, edges, f({ degree: "hub" })))).toEqual(["a"]);
  });
});

describe("filterGraphNodes — combinação (AND)", () => {
  it("todos os critérios precisam passar juntos", () => {
    const nodes = [
      node("alvo", { label: "Bayes", group: "FLASHCARD", dominio: 0.2, prioridadeRevisao: 8 }),
      node("texto-nao", { label: "Markov", group: "FLASHCARD", dominio: 0.2, prioridadeRevisao: 8 }),
      node("tipo-nao", { label: "Bayes", group: "NOTA", dominio: 0.2, prioridadeRevisao: 8 }),
      node("dom-nao", { label: "Bayes", group: "FLASHCARD", dominio: 0.9, prioridadeRevisao: 8 }),
    ];
    const out = filterGraphNodes(
      nodes,
      [],
      f({ query: "bayes", types: new Set(["FLASHCARD"]), domainMax: 40, priorityMin: 7 }),
    );
    expect(ids(out)).toEqual(["alvo"]);
  });
});
