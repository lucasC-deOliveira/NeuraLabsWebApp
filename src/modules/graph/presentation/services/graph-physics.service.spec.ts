import { describe, it, expect } from "vitest";
import { physicsStep } from "./graph-physics.service";

const node = (id: string, x: number, y: number) => ({ id, x, y });
const edge = (source: string, target: string) => ({ source, target });

function run(nodes: any[], edges: any[] = [], steps = 1) {
  let cur = nodes;
  for (let i = 0; i < steps; i++) cur = physicsStep(cur, edges);
  return cur;
}

const angleAround = (n: { x: number; y: number }, a: { x: number; y: number }) =>
  Math.atan2(n.y - a.y, n.x - a.x);

describe("physicsStep (modelo orbital origem→destino)", () => {
  it("sem arestas, ninguém se move", () => {
    const nodes = [node("a", 0, 0), node("b", 100, 0)];
    expect(run(nodes, [], 10)).toEqual(nodes);
  });

  it("a origem fica parada e o destino orbita ao redor dela", () => {
    const out = run(
      [node("origem", 0, 0), node("destino", 100, 0)],
      [edge("origem", "destino")],
      30
    );
    const origem = out.find((n) => n.id === "origem")!;
    const destino = out.find((n) => n.id === "destino")!;
    // origem imóvel
    expect(origem.x).toBe(0);
    expect(origem.y).toBe(0);
    // destino mudou de ângulo em torno da origem
    expect(Math.abs(angleAround(destino, origem))).toBeGreaterThan(0.01);
  });

  it("o raio da órbita é preservado (rotação pura)", () => {
    const out = run(
      [node("origem", 0, 0), node("destino", 150, 0)],
      [edge("origem", "destino")],
      100
    );
    const destino = out.find((n) => n.id === "destino")!;
    expect(Math.hypot(destino.x, destino.y)).toBeCloseTo(150, 6);
  });

  it("origem que é destino de outro nó também orbita (cadeia a→b→c)", () => {
    const out = run(
      [node("a", 0, 0), node("b", 100, 0), node("c", 160, 0)],
      [edge("a", "b"), edge("b", "c")],
      60
    );
    const a = out.find((n) => n.id === "a")!;
    const b = out.find((n) => n.id === "b")!;
    // a é raiz: parado
    expect(a.x).toBe(0);
    expect(a.y).toBe(0);
    // b orbita a
    expect(Math.abs(angleAround(b, a))).toBeGreaterThan(0.01);
    expect(Math.hypot(b.x, b.y)).toBeCloseTo(100, 4);
  });

  it("destino de múltiplas origens orbita o centro delas", () => {
    const out = run(
      [node("s1", 0, 0), node("s2", 200, 0), node("t", 100, 80)],
      [edge("s1", "t"), edge("s2", "t")],
      50
    );
    const t = out.find((n) => n.id === "t")!;
    // âncora fixa em (100, 0): raio preservado
    expect(Math.hypot(t.x - 100, t.y - 0)).toBeCloseTo(80, 5);
    // origens paradas
    expect(out.find((n) => n.id === "s1")).toMatchObject({ x: 0, y: 0 });
    expect(out.find((n) => n.id === "s2")).toMatchObject({ x: 200, y: 0 });
  });

  it("movimento é lento: arco máximo de 0.5px por frame (raio dentro da faixa)", () => {
    let prev: any[] = [node("o", 0, 0), node("t", 250, 0)];
    const edges = [edge("o", "t")];
    for (let i = 0; i < 30; i++) {
      const next = physicsStep(prev, edges);
      const moved = Math.hypot(next[1].x - prev[1].x, next[1].y - prev[1].y);
      expect(moved).toBeLessThanOrEqual(0.5 + 1e-9);
      prev = next;
    }
  });

  describe("faixa de raio da órbita", () => {
    it("raio abaixo do mínimo cresce até 80 e estabiliza", () => {
      const out = run([node("o", 0, 0), node("t", 30, 0)], [edge("o", "t")], 200);
      const t = out.find((n) => n.id === "t")!;
      expect(Math.hypot(t.x, t.y)).toBeCloseTo(80, 4);
    });

    it("raio acima do máximo encolhe até 300 e estabiliza", () => {
      const out = run([node("o", 0, 0), node("t", 600, 0)], [edge("o", "t")], 500);
      const t = out.find((n) => n.id === "t")!;
      expect(Math.hypot(t.x, t.y)).toBeCloseTo(300, 4);
    });

    it("raio dentro da faixa não é alterado", () => {
      const out = run([node("o", 0, 0), node("t", 200, 0)], [edge("o", "t")], 100);
      const t = out.find((n) => n.id === "t")!;
      expect(Math.hypot(t.x, t.y)).toBeCloseTo(200, 5);
    });

    // Mutação: a convergência é suave — no máximo 0.8px de ajuste por frame
    it("ajuste de raio limitado a 0.8px por frame", () => {
      let prev: any[] = [node("o", 0, 0), node("t", 600, 0)];
      const edges = [edge("o", "t")];
      for (let i = 0; i < 20; i++) {
        const next = physicsStep(prev, edges);
        const rPrev = Math.hypot(prev[1].x, prev[1].y);
        const rNext = Math.hypot(next[1].x, next[1].y);
        expect(Math.abs(rNext - rPrev)).toBeLessThanOrEqual(0.8 + 1e-9);
        prev = next;
      }
    });
  });

  it("raios pequenos giram na velocidade angular padrão", () => {
    const out = run([node("o", 0, 0), node("t", 50, 0)], [edge("o", "t")], 1);
    const t = out.find((n) => n.id === "t")!;
    expect(angleAround(t, { x: 0, y: 0 })).toBeCloseTo(0.004, 6);
  });

  it("destino sobreposto à origem é afastado para o raio mínimo", () => {
    const out = run([node("o", 50, 50), node("t", 50, 50)], [edge("o", "t")], 1);
    const t = out.find((n) => n.id === "t")!;
    expect(Math.hypot(t.x - 50, t.y - 50)).toBeCloseTo(80, 6);
  });

  it("auto-relação não move o nó", () => {
    const nodes = [node("a", 10, 10), node("b", 100, 100)];
    expect(run(nodes, [edge("a", "a")], 10)).toEqual(nodes);
  });

  it("aresta com nó inexistente é ignorada — tudo parado", () => {
    const nodes = [node("a", 0, 0), node("b", 100, 0)];
    expect(run(nodes, [edge("a", "fantasma")], 5)).toEqual(nodes);
  });

  it("preserva campos extras dos nós (label, width, etc.)", () => {
    const rich = [
      { ...node("o", 0, 0), label: "O", width: 80 },
      { ...node("t", 90, 0), label: "T", width: 90 },
    ];
    const out = run(rich as any[], [edge("o", "t")], 3);
    const t = out.find((n: any) => n.id === "t") as any;
    expect(t.label).toBe("T");
    expect(t.width).toBe(90);
  });

  // Mutação: sentido consistente — dois frames giram mais que um
  it("a rotação acumula ao longo dos frames", () => {
    const one = run([node("o", 0, 0), node("t", 100, 0)], [edge("o", "t")], 1);
    const many = run([node("o", 0, 0), node("t", 100, 0)], [edge("o", "t")], 20);
    const a1 = Math.abs(angleAround(one.find((n) => n.id === "t")!, { x: 0, y: 0 }));
    const a20 = Math.abs(angleAround(many.find((n) => n.id === "t")!, { x: 0, y: 0 }));
    expect(a20).toBeGreaterThan(a1);
  });
});
