import { describe, it, expect } from "vitest";
import { orderStudyQueue, hasGraphWeights, STUDY_ORDERS, type StudyOrder } from "./study-order";

interface Card {
  id: string;
  importancia: number | null;
}

const fila = (...cards: Array<[string, number | null]>): Card[] =>
  cards.map(([id, importancia]) => ({ id, importancia }));

const ids = (cards: Card[]): string[] => cards.map((c) => c.id);

describe("orderStudyQueue", () => {
  const baralho = fila(["recursao", 0.1], ["dijkstra", 0.9], ["bellman", 0.5]);

  it("keeps the deck's own order in the classic mode", () => {
    expect(ids(orderStudyQueue(baralho, "classico"))).toEqual(["recursao", "dijkstra", "bellman"]);
  });

  it("puts the heaviest concept first in the weighted mode", () => {
    expect(ids(orderStudyQueue(baralho, "peso"))).toEqual(["dijkstra", "bellman", "recursao"]);
  });

  it("does not mutate the queue it received", () => {
    orderStudyQueue(baralho, "peso");
    expect(ids(baralho)).toEqual(["recursao", "dijkstra", "bellman"]);
  });

  // Card sem conceito no grafo não é "importância zero": é desconhecido. Vai para o
  // fim, mas sem se declarar menos importante que um conceito medido em 0.
  it("sends cards with no weight to the end, keeping their relative order", () => {
    const misto = fila(["semA", null], ["dijkstra", 0.9], ["semB", null], ["recursao", 0.1]);
    expect(ids(orderStudyQueue(misto, "peso"))).toEqual(["dijkstra", "recursao", "semA", "semB"]);
  });

  it("leaves a deck with no weights exactly as it was", () => {
    const semPeso = fila(["a", null], ["b", null], ["c", null]);
    expect(ids(orderStudyQueue(semPeso, "peso"))).toEqual(["a", "b", "c"]);
  });

  // Empate mantém a ordem do baralho: uma ordenação instável faria a mesma sessão
  // abrir diferente a cada vez, sem motivo visível.
  it("breaks ties by the deck's order", () => {
    const empate = fila(["primeiro", 0.5], ["segundo", 0.5], ["terceiro", 0.5]);
    expect(ids(orderStudyQueue(empate, "peso"))).toEqual(["primeiro", "segundo", "terceiro"]);
  });

  it("handles an empty queue", () => {
    expect(orderStudyQueue([], "peso")).toEqual([]);
  });

  it("falls back to the deck order for an unknown mode, instead of throwing", () => {
    expect(ids(orderStudyQueue(baralho, "nao-existe" as StudyOrder))).toEqual([
      "recursao",
      "dijkstra",
      "bellman",
    ]);
  });
});

describe("hasGraphWeights", () => {
  it("is true when at least one card carries a weight", () => {
    expect(hasGraphWeights(fila(["a", null], ["b", 0.3]))).toBe(true);
  });

  // É o caso dos baralhos importados (NODEJS, Inglês): nenhum card está no grafo,
  // então o modo por peso não tem o que fazer e a sessão avisa.
  it("is false when no card is in the graph", () => {
    expect(hasGraphWeights(fila(["a", null], ["b", null]))).toBe(false);
    expect(hasGraphWeights([])).toBe(false);
  });

  // Importância 0 é uma medida ("está no grafo e não cai em prova"), não a ausência
  // dela — o aviso de "sem pesos" seria mentira aqui.
  it("counts a measured zero as a weight", () => {
    expect(hasGraphWeights(fila(["a", 0]))).toBe(true);
  });
});

describe("STUDY_ORDERS", () => {
  it("offers the two modes with a label", () => {
    expect(STUDY_ORDERS.map((o) => o.id)).toEqual(["classico", "peso"]);
    for (const order of STUDY_ORDERS) expect(order.titulo).not.toBe("");
  });
});
