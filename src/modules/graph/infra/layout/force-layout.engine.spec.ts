import { describe, it, expect } from "vitest";
import { runForceLayout } from "./force-layout.engine";

function makeNode(type: string, label = "Etiqueta") {
  return {
    id: `${type}-${label}`,
    label,
    type,
    nivelDominio: 0,
    prioridadeRevisao: 5,
  } as any;
}

function layoutSingle(type: string, label?: string) {
  const { nodes } = runForceLayout([makeNode(type, label)], [], 1000, 800);
  return nodes[0];
}

describe("runForceLayout — dimensões por forma do nó", () => {
  it("ASSUNTO é círculo: largura === altura (diâmetro)", () => {
    const n = layoutSingle("ASSUNTO");
    expect(n.width).toBe(n.height);
  });

  it("ASSUNTO tem diâmetro entre 70 e 160 mesmo com rótulos extremos", () => {
    const curto = layoutSingle("ASSUNTO", "ab");
    const longo = layoutSingle("ASSUNTO", "x".repeat(80));
    expect(curto.width).toBeGreaterThanOrEqual(70);
    expect(longo.width).toBeLessThanOrEqual(160);
  });

  it("TOPICO (elipse) tem folga horizontal além do rótulo e altura 50", () => {
    const label = "Topico Grande";
    const n = layoutSingle("TOPICO", label);
    const labelW = Math.max(60, Math.min(200, label.length * 7 + 24));
    expect(n.width).toBeGreaterThan(labelW);
    expect(n.height).toBe(50);
  });

  it("CONCEITO é retângulo horizontal: largura do rótulo e altura 40", () => {
    const label = "Conceito Grande";
    const n = layoutSingle("CONCEITO", label);
    expect(n.width).toBe(Math.max(60, Math.min(200, label.length * 7 + 24)));
    expect(n.height).toBe(40);
    expect(n.width).toBeGreaterThan(n.height);
  });

  it("NOTA e FLASHCARD são retângulos verticais: altura > largura", () => {
    for (const tipo of ["NOTA", "FLASHCARD"]) {
      const n = layoutSingle(tipo);
      expect(n.height, tipo).toBeGreaterThan(n.width);
    }
  });

  it("NOTA/FLASHCARD têm largura entre 64 e 120", () => {
    const curto = layoutSingle("NOTA", "ab");
    const longo = layoutSingle("FLASHCARD", "x".repeat(80));
    expect(curto.width).toBeGreaterThanOrEqual(64);
    expect(longo.width).toBeLessThanOrEqual(120);
  });

  // Mutação: teto de largura da elipse
  it("TOPICO não passa de 240 de largura", () => {
    const t = layoutSingle("TOPICO", "x".repeat(100));
    expect(t.width).toBeLessThanOrEqual(240);
  });

  it("largura derivada do rótulo cresce com o tamanho do texto (até o teto)", () => {
    const curto = layoutSingle("CONCEITO", "abc");
    const medio = layoutSingle("CONCEITO", "a".repeat(15));
    expect(medio.width).toBeGreaterThan(curto.width);
  });
});

describe("runForceLayout — estrutura do resultado", () => {
  it("preserva id, label e tipo nos nós simulados", () => {
    const { nodes } = runForceLayout([makeNode("CONCEITO", "Soberania")], [], 1000, 800);
    expect(nodes[0]).toMatchObject({
      label: "Soberania",
      group: "CONCEITO",
      tipoReal: "CONCEITO",
    });
  });

  it("mapeia arestas com o rótulo da relação", () => {
    const raw = [makeNode("NOTA", "N"), makeNode("CONCEITO", "C")];
    const { edges } = runForceLayout(
      raw,
      [{ source: raw[0].id, target: raw[1].id, type: "DEFINE", peso: 1 }] as any,
      1000,
      800
    );
    expect(edges).toHaveLength(1);
    expect(edges[0].label).toBe("define");
    expect(edges[0].type).toBe("DEFINE");
  });

  it("posiciona nós dentro de limites finitos", () => {
    const { nodes } = runForceLayout(
      [makeNode("TOPICO", "a"), makeNode("TOPICO", "b")],
      [],
      1000,
      800
    );
    for (const n of nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });
});
