import { describe, it, expect } from "vitest";
import { BARALHO_TITULO_MAX } from "@contracts/baralhos";
import {
  MAX_DECK_FLASHCARDS,
  createEdgeContract,
  createGraphBaralhoContract,
  createGraphContract,
  extractSubgraphContract,
  graphPositionsContract,
  linkNodeContract,
  updateEdgeContract,
} from "@contracts/graph";

describe("createGraphContract", () => {
  it("exige o nome e apara", () => {
    expect(createGraphContract.safeParse({ nome: "   " }).success).toBe(false);
    expect(createGraphContract.parse({ nome: "  Biologia  " }).nome).toBe("Biologia");
  });

  it("deixa a descrição opcional", () => {
    expect(createGraphContract.safeParse({ nome: "Bio" }).success).toBe(true);
  });
});

describe("linkNodeContract", () => {
  it("aceita os tipos de nó conhecidos", () => {
    expect(linkNodeContract.safeParse({ tipoNode: "CONCEITO", entityId: "c1" }).success).toBe(true);
  });

  it("recusa um tipo de nó inventado, em vez de repassar para o banco", () => {
    expect(linkNodeContract.safeParse({ tipoNode: "PLANILHA", entityId: "c1" }).success).toBe(false);
  });
});

describe("createGraphBaralhoContract", () => {
  it("assume lista vazia de cards", () => {
    expect(createGraphBaralhoContract.parse({ titulo: "Bio" }).flashcardIds).toEqual([]);
  });

  it("aplica o teto de flashcards do normalizeDeckCreation", () => {
    const ids = Array.from({ length: MAX_DECK_FLASHCARDS + 1 }, (_, i) => `f${i}`);
    expect(createGraphBaralhoContract.safeParse({ titulo: "Bio", flashcardIds: ids }).success).toBe(false);
    expect(createGraphBaralhoContract.safeParse({ titulo: "Bio", flashcardIds: ids.slice(1) }).success).toBe(true);
  });

  // Esta rota NÃO tem o teto de 120 do módulo baralhos — a divergência é real e
  // fica registrada aqui até virar decisão de produto.
  it("aceita título maior que o teto do módulo baralhos, como o backend faz hoje", () => {
    const longo = { titulo: "x".repeat(BARALHO_TITULO_MAX + 1) };
    expect(createGraphBaralhoContract.safeParse(longo).success).toBe(true);
  });
});

describe("createEdgeContract / updateEdgeContract", () => {
  const aresta = { sourceNodeId: "a", targetNodeId: "b", tipoRelacao: "PERTENCE_A" };

  it("aceita uma aresta completa", () => {
    expect(createEdgeContract.safeParse({ ...aresta, peso: 0.5 }).success).toBe(true);
  });

  // A faixa vem do sistema, não de invenção: vault-sync.ts e graph-json-import.ts
  // já tratam 0 < peso <= 2, e um teste do backend usa peso 2.
  it("aceita a faixa de peso que o resto do sistema já trata", () => {
    expect(createEdgeContract.safeParse({ ...aresta, peso: 2 }).success).toBe(true);
    expect(createEdgeContract.safeParse({ ...aresta, peso: 0.5 }).success).toBe(true);
  });

  it("recusa peso fora dessa faixa", () => {
    expect(createEdgeContract.safeParse({ ...aresta, peso: 0 }).success).toBe(false);
    expect(createEdgeContract.safeParse({ ...aresta, peso: 2.5 }).success).toBe(false);
    expect(createEdgeContract.safeParse({ ...aresta, peso: -1 }).success).toBe(false);
  });

  it("exige as duas pontas da aresta", () => {
    expect(createEdgeContract.safeParse({ ...aresta, sourceNodeId: "" }).success).toBe(false);
  });

  it("permite atualizar só o peso", () => {
    expect(updateEdgeContract.safeParse({ peso: 1 }).success).toBe(true);
  });
});

describe("graphPositionsContract", () => {
  it("aceita o mapa de posições por id", () => {
    expect(graphPositionsContract.safeParse({ positions: { n1: { x: 1, y: 2 } } }).success).toBe(true);
  });

  it("recusa posição sem coordenada", () => {
    expect(graphPositionsContract.safeParse({ positions: { n1: { x: 1 } } }).success).toBe(false);
  });
});

describe("extractSubgraphContract", () => {
  it("exige ao menos um nó para extrair", () => {
    const base = { nome: "Recorte", tipoRelacao: "PERTENCE_A" };
    expect(extractSubgraphContract.safeParse({ ...base, nodeIds: [] }).success).toBe(false);
    expect(extractSubgraphContract.safeParse({ ...base, nodeIds: ["n1"] }).success).toBe(true);
  });
});
