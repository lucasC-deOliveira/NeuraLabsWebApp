import { describe, it, expect } from "vitest";
import { graphVaultDir } from "./vault-sync";

describe("graphVaultDir", () => {
  it("monta <base>/<slug>--<id>", () => {
    expect(graphVaultDir("/vault", "abc-123", "Algoritmos")).toBe("/vault/algoritmos--abc-123");
  });

  it("slugifica o nome do grafo", () => {
    expect(graphVaultDir("/vault", "x1", "Fisiologia Humana")).toBe("/vault/fisiologia-humana--x1");
  });

  it("remove acentos do nome do grafo", () => {
    expect(graphVaultDir("/vault", "x2", "Álgebra Linear")).toBe("/vault/algebra-linear--x2");
  });

  it("grafos diferentes produzem subpastas diferentes", () => {
    const a = graphVaultDir("/vault", "id-1", "Matemática");
    const b = graphVaultDir("/vault", "id-2", "Matemática");
    expect(a).not.toBe(b);
  });

  it("mesmo grafo com bases diferentes produz caminhos diferentes", () => {
    const a = graphVaultDir("/vault-a", "id-1", "Grafo");
    const b = graphVaultDir("/vault-b", "id-1", "Grafo");
    expect(a).not.toBe(b);
  });
});
