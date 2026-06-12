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

describe("runForceLayout — dimensões por forma do nó (fixas e uniformes)", () => {
  const TYPES = ["ASSUNTO", "TOPICO", "CONCEITO", "NOTA", "FLASHCARD"];

  it("ASSUNTO é círculo: largura === altura (diâmetro)", () => {
    const n = layoutSingle("ASSUNTO");
    expect(n.width).toBe(n.height);
  });

  it("TOPICO (elipse) é mais largo que alto", () => {
    const n = layoutSingle("TOPICO");
    expect(n.width).toBeGreaterThan(n.height);
  });

  it("CONCEITO é retângulo horizontal: mais largo que alto", () => {
    const n = layoutSingle("CONCEITO");
    expect(n.width).toBeGreaterThan(n.height);
  });

  it("NOTA é retângulo vertical: mais alto que largo", () => {
    const n = layoutSingle("NOTA");
    expect(n.height).toBeGreaterThan(n.width);
  });

  it("FLASHCARD é quadrado perfeito", () => {
    const n = layoutSingle("FLASHCARD");
    expect(n.width).toBe(n.height);
  });

  it("o tamanho NÃO varia com o rótulo (uniforme)", () => {
    for (const type of TYPES) {
      const curto = layoutSingle(type, "ab");
      const longo = layoutSingle(type, "x".repeat(80));
      expect(curto.width).toBe(longo.width);
      expect(curto.height).toBe(longo.height);
    }
  });

  it("a NOTA é compacta: nenhuma dimensão passa de 84", () => {
    const n = layoutSingle("NOTA");
    expect(Math.max(n.width, n.height)).toBeLessThanOrEqual(84);
  });

  it("todos os nós têm tamanho uniforme entre si (maior lado entre 56 e 104)", () => {
    for (const type of TYPES) {
      const n = layoutSingle(type);
      const maxSide = Math.max(n.width, n.height);
      expect(maxSide).toBeGreaterThanOrEqual(56);
      expect(maxSide).toBeLessThanOrEqual(104);
    }
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
