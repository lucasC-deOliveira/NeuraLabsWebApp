import { describe, it, expect } from "vitest";
import { isFirstOpenOfGraph } from "./big-bang-guard";

describe("isFirstOpenOfGraph", () => {
  it("runs on the very first open (nothing animated yet)", () => {
    expect(isFirstOpenOfGraph(null, "g1")).toBe(true);
  });

  it("does NOT re-run when the same graph's data refreshes", () => {
    // Regressão: fechar o modal de estudo faz refreshGraph → setRawNodes; o big-bang
    // não pode re-montar o layout do mesmo grafo.
    expect(isFirstOpenOfGraph("g1", "g1")).toBe(false);
  });

  it("runs again when the open graph changes", () => {
    expect(isFirstOpenOfGraph("g1", "g2")).toBe(true);
  });
});
