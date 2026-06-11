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
  it("CONCEITO é quadrado: largura === altura", () => {
    const n = layoutSingle("CONCEITO");
    expect(n.width).toBe(n.height);
  });

  it("CONCEITO tem lado entre 64 e 120 mesmo com rótulos extremos", () => {
    const curto = layoutSingle("CONCEITO", "ab");
    const longo = layoutSingle("CONCEITO", "x".repeat(80));
    expect(curto.width).toBeGreaterThanOrEqual(64);
    expect(longo.width).toBeLessThanOrEqual(120);
  });

  it("NOTA é retângulo vertical: altura > largura", () => {
    const n = layoutSingle("NOTA");
    expect(n.height).toBeGreaterThan(n.width);
  });

  it("ASSUNTO (elipse) tem folga horizontal além do rótulo e altura 60", () => {
    const label = "Materia Direito";
    const n = layoutSingle("ASSUNTO", label);
    const labelW = Math.max(60, Math.min(200, label.length * 7 + 24));
    expect(n.width).toBeGreaterThan(labelW);
    expect(n.height).toBe(60);
  });

  it("FLASHCARD (losango) é mais largo que o rótulo e tem altura 64", () => {
    const label = "Pergunta do cartao";
    const n = layoutSingle("FLASHCARD", label);
    const labelW = Math.max(60, Math.min(200, label.length * 7 + 24));
    expect(n.width).toBeGreaterThan(labelW);
    expect(n.height).toBe(64);
  });

  it("TOPICO usa a largura do rótulo e altura 40", () => {
    const label = "Topico Grande";
    const n = layoutSingle("TOPICO", label);
    expect(n.width).toBe(Math.max(60, Math.min(200, label.length * 7 + 24)));
    expect(n.height).toBe(40);
  });

  // Mutação: limites de largura do losango e da elipse
  it("FLASHCARD não passa de 260 de largura; ASSUNTO não passa de 240", () => {
    const fc = layoutSingle("FLASHCARD", "x".repeat(100));
    const as = layoutSingle("ASSUNTO", "x".repeat(100));
    expect(fc.width).toBeLessThanOrEqual(260);
    expect(as.width).toBeLessThanOrEqual(240);
  });

  it("largura derivada do rótulo cresce com o tamanho do texto (até o teto)", () => {
    const curto = layoutSingle("TOPICO", "abc");
    const medio = layoutSingle("TOPICO", "a".repeat(15));
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
