import { describe, it, expect } from "vitest";
import { boundaryPoint, computeEdgeCurve, type NodeGeom } from "./edge-geometry.service";

const rectNode = (over: Partial<NodeGeom> = {}): NodeGeom => ({
  x: 0, y: 0, width: 100, height: 40, group: "CONCEITO", ...over,
});

describe("boundaryPoint", () => {
  describe("retângulo (CONCEITO)", () => {
    it("direção horizontal sai na borda direita", () => {
      const p = boundaryPoint(rectNode(), 1, 0);
      expect(p.x).toBeCloseTo(50);
      expect(p.y).toBeCloseTo(0);
    });

    it("direção vertical sai na borda inferior", () => {
      const p = boundaryPoint(rectNode(), 0, 1);
      expect(p.x).toBeCloseTo(0);
      expect(p.y).toBeCloseTo(20);
    });

    it("ponto fica sempre sobre o contorno da caixa", () => {
      for (const [dx, dy] of [[1, 1], [-2, 1], [3, -4], [-1, -1]]) {
        const p = boundaryPoint(rectNode(), dx, dy);
        const onVertical = Math.abs(Math.abs(p.x) - 50) < 1e-6 && Math.abs(p.y) <= 20 + 1e-6;
        const onHorizontal = Math.abs(Math.abs(p.y) - 20) < 1e-6 && Math.abs(p.x) <= 50 + 1e-6;
        expect(onVertical || onHorizontal).toBe(true);
      }
    });
  });

  describe("elipse (TOPICO)", () => {
    it("ponto satisfaz a equação da elipse (x/a)² + (y/b)² = 1", () => {
      const node = rectNode({ group: "TOPICO", width: 120, height: 60 });
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-3, 2]]) {
        const p = boundaryPoint(node, dx, dy);
        const v = (p.x / 60) ** 2 + (p.y / 30) ** 2;
        expect(v).toBeCloseTo(1, 5);
      }
    });
  });

  describe("círculo (ASSUNTO)", () => {
    it("ponto fica sempre à distância do raio, em qualquer direção", () => {
      const node = rectNode({ group: "ASSUNTO", width: 100, height: 100 });
      for (const [dx, dy] of [[1, 0], [0, -1], [2, 1], [-1, -2]]) {
        const p = boundaryPoint(node, dx, dy);
        expect(Math.hypot(p.x, p.y)).toBeCloseTo(50, 5);
      }
    });
  });

  describe("retângulo vertical (NOTA)", () => {
    it("ponto fica sobre o contorno da caixa vertical", () => {
      const node = rectNode({ group: "NOTA", width: 80, height: 120 });
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 2], [-2, -3]]) {
        const p = boundaryPoint(node, dx, dy);
        const onVertical = Math.abs(Math.abs(p.x) - 40) < 1e-6 && Math.abs(p.y) <= 60 + 1e-6;
        const onHorizontal = Math.abs(Math.abs(p.y) - 60) < 1e-6 && Math.abs(p.x) <= 40 + 1e-6;
        expect(onVertical || onHorizontal).toBe(true);
      }
    });
  });

  it("desloca a partir do centro real do nó (não da origem)", () => {
    const p = boundaryPoint(rectNode({ x: 200, y: 100 }), 1, 0);
    expect(p.x).toBeCloseTo(250);
    expect(p.y).toBeCloseTo(100);
  });

  // Mutação: direção preservada — o ponto está do lado para onde a direção aponta
  it("ponto fica do lado da direção informada", () => {
    const right = boundaryPoint(rectNode(), 1, 0);
    const left = boundaryPoint(rectNode(), -1, 0);
    expect(right.x).toBeGreaterThan(0);
    expect(left.x).toBeLessThan(0);
  });

  it("não explode com direção nula", () => {
    const p = boundaryPoint(rectNode(), 0, 0);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
  });
});

describe("computeEdgeCurve", () => {
  const a = rectNode({ x: 0, y: 0 });
  const b = rectNode({ x: 300, y: 0 });

  it("pontas saem das bordas, não dos centros", () => {
    const c = computeEdgeCurve(a, b);
    // borda direita de a (~50) e borda esquerda de b (~250)
    expect(c.p0.x).toBeGreaterThan(40);
    expect(c.p0.x).toBeLessThan(60);
    expect(c.p2.x).toBeGreaterThan(240);
    expect(c.p2.x).toBeLessThan(260);
  });

  it("ponto de controle é perpendicular ao meio do segmento", () => {
    const c = computeEdgeCurve(a, b);
    expect(c.cx).toBeCloseTo(150); // meio em x
    expect(c.cy).not.toBeCloseTo(0); // deslocado em y (curvatura)
  });

  it("offset da curvatura fica entre 14 e 40", () => {
    const near = computeEdgeCurve(a, rectNode({ x: 60, y: 0 }));
    const far = computeEdgeCurve(a, rectNode({ x: 5000, y: 0 }));
    expect(Math.abs(near.cy)).toBeCloseTo(14, 5);
    expect(Math.abs(far.cy)).toBeCloseTo(40, 5);
  });

  it("offset escala com a distância na faixa intermediária", () => {
    // dist 200 → 24
    const c = computeEdgeCurve(a, rectNode({ x: 200, y: 0 }));
    expect(Math.abs(c.cy)).toBeCloseTo(24, 5);
  });

  // Mutação: arestas em sentidos opostos curvam para lados opostos
  it("A→B e B→A curvam para lados diferentes", () => {
    const ab = computeEdgeCurve(a, b);
    const ba = computeEdgeCurve(b, a);
    expect(Math.sign(ab.cy)).not.toBe(Math.sign(ba.cy));
  });

  it("ângulo do rótulo fica em (-90, 90] — nunca de cabeça para baixo", () => {
    const dirs = [
      [300, 0], [0, 300], [-300, 0], [0, -300],
      [300, 300], [-300, 300], [300, -300], [-300, -300],
    ];
    for (const [x, y] of dirs) {
      const c = computeEdgeCurve(a, rectNode({ x, y }));
      expect(c.angle).toBeGreaterThan(-90 - 1e-9);
      expect(c.angle).toBeLessThanOrEqual(90 + 1e-9);
    }
  });

  it("ponto médio da quadrática segue a fórmula 0.25·p0 + 0.5·c + 0.25·p2", () => {
    const c = computeEdgeCurve(a, b);
    expect(c.qx).toBeCloseTo(0.25 * c.p0.x + 0.5 * c.cx + 0.25 * c.p2.x, 9);
    expect(c.qy).toBeCloseTo(0.25 * c.p0.y + 0.5 * c.cy + 0.25 * c.p2.y, 9);
  });

  it("não explode com nós no mesmo ponto", () => {
    const c = computeEdgeCurve(a, rectNode({ x: 0, y: 0 }));
    expect(Number.isFinite(c.qx)).toBe(true);
    expect(Number.isFinite(c.angle)).toBe(true);
  });

  describe("endTangent (direção da seta no destino)", () => {
    it("é um vetor unitário", () => {
      const c = computeEdgeCurve(a, b);
      expect(Math.hypot(c.endTangent.x, c.endTangent.y)).toBeCloseTo(1, 9);
    });

    it("aponta do controle para a ponta final (chega ao destino)", () => {
      const c = computeEdgeCurve(a, b); // b à direita de a
      expect(c.endTangent.x).toBeGreaterThan(0);
    });

    // Mutação: sentido invertido apontaria para fora do destino
    it("inverte junto com a direção da aresta", () => {
      const ab = computeEdgeCurve(a, b);
      const ba = computeEdgeCurve(b, a);
      expect(Math.sign(ab.endTangent.x)).not.toBe(Math.sign(ba.endTangent.x));
    });

    it("é finito mesmo com nós sobrepostos", () => {
      const c = computeEdgeCurve(a, rectNode({ x: 0, y: 0 }));
      expect(Number.isFinite(c.endTangent.x)).toBe(true);
      expect(Number.isFinite(c.endTangent.y)).toBe(true);
    });
  });
});
