import { describe, it, expect } from "vitest";
import {
  physicsStep,
  DEFAULT_PHYSICS_OPTIONS,
  type PhysicsOptions,
} from "./graph-physics.service";

const node = (id: string, x: number, y: number) => ({ id, x, y, vx: 0, vy: 0 });
const edge = (source: string, target: string, peso = 1) => ({ source, target, peso });
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const opts = (patch: Partial<PhysicsOptions> = {}): PhysicsOptions => ({
  ...DEFAULT_PHYSICS_OPTIONS,
  ...patch,
});

function run(nodes: any[], edges: any[] = [], steps = 1, options?: PhysicsOptions) {
  let cur = nodes;
  for (let i = 0; i < steps; i++) cur = physicsStep(cur, edges, options);
  return cur;
}

// roda até o sistema estabilizar (physicsStep devolve a mesma referência)
function runUntilStable(
  nodes: any[],
  edges: any[] = [],
  options?: PhysicsOptions,
  max = 6000,
) {
  let cur = nodes;
  for (let i = 0; i < max; i++) {
    const next = physicsStep(cur, edges, options);
    if (next === cur) return { nodes: cur, steps: i };
    cur = next;
  }
  return { nodes: cur, steps: max };
}

const find = (arr: any[], id: string) => arr.find((n) => n.id === id)!;
const centroid = (arr: { x: number; y: number }[]) => ({
  x: arr.reduce((s, n) => s + n.x, 0) / arr.length,
  y: arr.reduce((s, n) => s + n.y, 0) / arr.length,
});

describe("physicsStep (modelo force-directed inspirado no vis-network)", () => {
  it("menos de 2 nós: devolve a mesma referência", () => {
    const one = [node("a", 0, 0)];
    expect(physicsStep(one, [])).toBe(one);
    const none: any[] = [];
    expect(physicsStep(none, [])).toBe(none);
  });

  it("é puro/determinístico: mesma entrada → mesma saída", () => {
    const nodes = [node("a", 0, 0), node("b", 40, 10), node("c", -30, 50)];
    const edges = [edge("a", "b"), edge("b", "c")];
    const out1 = run(nodes, edges, 25, opts());
    const out2 = run(nodes, edges, 25, opts());
    expect(out1).toEqual(out2);
  });

  it("não muta os nós de entrada", () => {
    const nodes = [node("a", 0, 0), node("b", 20, 0)];
    const snapshot = JSON.parse(JSON.stringify(nodes));
    physicsStep(nodes, [edge("a", "b")], opts());
    expect(nodes).toEqual(snapshot);
  });

  it("o sistema estabiliza e passa a devolver a mesma referência", () => {
    const nodes = [
      node("a", -200, 0),
      node("b", 220, 30),
      node("c", 10, -260),
      node("d", 5, 300),
    ];
    const edges = [edge("a", "b"), edge("b", "c"), edge("c", "d")];
    const { steps, nodes: settled } = runUntilStable(nodes, edges, opts());
    expect(steps).toBeLessThan(6000);
    // uma vez estável, continua estável (mesma referência)
    expect(physicsStep(settled, edges, opts())).toBe(settled);
  });

  describe("repulsão", () => {
    it("dois nós muito próximos se afastam", () => {
      const out = run([node("a", 0, 0), node("b", 5, 0)], [], 1, opts());
      expect(dist(find(out, "a"), find(out, "b"))).toBeGreaterThan(5);
    });

    it("nós exatamente sobrepostos são separados (sem NaN)", () => {
      const out = run([node("a", 50, 50), node("b", 50, 50)], [], 5, opts());
      const d = dist(find(out, "a"), find(out, "b"));
      expect(Number.isFinite(d)).toBe(true);
      expect(d).toBeGreaterThan(0);
    });

    it("repulsão maior afasta mais os nós no equilíbrio", () => {
      const start = () => [node("a", -60, 0), node("b", 60, 0)];
      const e = [edge("a", "b")];
      const weak = runUntilStable(start(), e, opts({ gravitationalConstant: 800 })).nodes;
      const strong = runUntilStable(start(), e, opts({ gravitationalConstant: 6000 })).nodes;
      expect(dist(find(strong, "a"), find(strong, "b"))).toBeGreaterThan(
        dist(find(weak, "a"), find(weak, "b")),
      );
    });
  });

  describe("molas (arestas)", () => {
    it("um par conectado assenta perto do comprimento de mola", () => {
      const L = 140;
      const start = [node("a", -400, 0), node("b", 400, 0)];
      const out = runUntilStable(start, [edge("a", "b")], opts({ springLength: L })).nodes;
      const d = dist(find(out, "a"), find(out, "b"));
      // equilíbrio fica perto de L (repulsão e gravidade deslocam um pouco)
      expect(d).toBeGreaterThan(L * 0.6);
      expect(d).toBeLessThan(L * 1.5);
    });

    it("comprimento de mola maior afasta mais o par conectado", () => {
      const start = () => [node("a", -50, 0), node("b", 50, 0)];
      const e = [edge("a", "b")];
      const shortL = runUntilStable(start(), e, opts({ springLength: 80 })).nodes;
      const longL = runUntilStable(start(), e, opts({ springLength: 320 })).nodes;
      expect(dist(find(longL, "a"), find(longL, "b"))).toBeGreaterThan(
        dist(find(shortL, "a"), find(shortL, "b")),
      );
    });

    it("aresta de peso maior puxa o par para mais perto mais rápido", () => {
      const start = () => [node("a", -300, 0), node("b", 300, 0)];
      const light = run(start(), [edge("a", "b", 0.3)], 40, opts());
      const heavy = run(start(), [edge("a", "b", 5)], 40, opts());
      expect(dist(find(heavy, "a"), find(heavy, "b"))).toBeLessThan(
        dist(find(light, "a"), find(light, "b")),
      );
    });

    it("auto-relação é ignorada", () => {
      const nodes = [node("a", 0, 0), node("b", 200, 0)];
      const withSelf = run(nodes, [edge("a", "a")], 10, opts());
      const without = run(nodes, [], 10, opts());
      expect(withSelf).toEqual(without);
    });

    it("aresta para nó inexistente é ignorada (sem crash)", () => {
      const nodes = [node("a", 0, 0), node("b", 100, 0)];
      const out = run(nodes, [edge("a", "fantasma")], 5, opts());
      expect(out.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
    });
  });

  describe("gravidade central", () => {
    it("gravidade maior deixa o grafo mais compacto", () => {
      const start = () => [
        node("a", -250, 0),
        node("b", 250, 0),
        node("c", 0, 250),
        node("d", 0, -250),
      ];
      const e = [edge("a", "b"), edge("c", "d")];
      const loose = runUntilStable(start(), e, opts({ centralGravity: 0.05 })).nodes;
      const tight = runUntilStable(start(), e, opts({ centralGravity: 1 })).nodes;
      const spread = (arr: any[]) => {
        const c = centroid(arr);
        return arr.reduce((s, n) => s + dist(n, c), 0) / arr.length;
      };
      expect(spread(tight)).toBeLessThan(spread(loose));
    });

    it("o centroide é preservado (sem deriva global)", () => {
      const nodes = [node("a", -100, 20), node("b", 140, -30), node("c", 0, 90)];
      const edges = [edge("a", "b"), edge("b", "c")];
      const c0 = centroid(nodes);
      const out = run(nodes, edges, 200, opts());
      const c1 = centroid(out);
      // forças internas conservam o momento; pequenas derivas vêm do clamp de
      // velocidade — o grafo não pode "fugir" globalmente
      expect(Math.abs(c1.x - c0.x)).toBeLessThan(5);
      expect(Math.abs(c1.y - c0.y)).toBeLessThan(5);
    });
  });

  describe("integração", () => {
    it("o deslocamento por frame é limitado (sem saltos)", () => {
      // já separados (> minDist) para medir o movimento dirigido por velocidade.
      // A separação de sobreposição inicial é uma correção geométrica do solver
      // de restrição (Passo 2), limitada à parte e testada separadamente.
      let prev: any[] = [node("a", 0, 0), node("b", 120, 0)];
      for (let i = 0; i < 30; i++) {
        const next = physicsStep(prev, [], opts());
        for (let k = 0; k < next.length; k++) {
          const moved = dist(next[k], prev[k]);
          // MAX_VELOCITY (16) * TIMESTEP (0.85) ≈ 13.6
          expect(moved).toBeLessThanOrEqual(16 * 0.85 + 1e-6);
        }
        prev = next;
      }
    });

    it("preserva campos extras dos nós (label, width, etc.)", () => {
      const rich = [
        { ...node("a", 0, 0), label: "A", width: 80, height: 80 },
        { ...node("b", 90, 0), label: "B", width: 90, height: 60 },
      ];
      const out = run(rich as any[], [edge("a", "b")], 10, opts());
      const b = find(out, "b") as any;
      expect(b.label).toBe("B");
      expect(b.width).toBe(90);
      expect(b.height).toBe(60);
    });

    it("o sistema converge (energia cai ao longo do tempo)", () => {
      const start = [node("a", -200, 0), node("b", 200, 0), node("c", 0, 200)];
      const e = [edge("a", "b"), edge("b", "c")];
      const kinetic = (arr: any[]) =>
        arr.reduce((s, n) => s + n.vx * n.vx + n.vy * n.vy, 0);
      const early = run(start, e, 30, opts());
      const late = run(early, e, 300, opts());
      expect(kinetic(late)).toBeLessThan(kinetic(early));
    });
  });

  describe("clusters hierárquicos (clusterBy: hierarchy)", () => {
    const hnode = (id: string, x: number, y: number, group: string, extra: any = {}) =>
      ({ id, x, y, vx: 0, vy: 0, group, ...extra });

    // só a força orbital ligada, para isolar a órbita do raio-alvo
    const orbitalOnly = (patch: Partial<PhysicsOptions> = {}): PhysicsOptions => ({
      ...DEFAULT_PHYSICS_OPTIONS,
      gravitationalConstant: 0,
      centralGravity: 0,
      springConstant: 0,
      clusterStrength: 0,
      clusterRepulsion: 0,
      avoidOverlap: 0,
      minGap: 0,
      orbitalStrength: 0.1,
      ...patch,
    });

    it("um filho assenta perto do raio-alvo orbital ao redor do pai", () => {
      // TOPICO orbita ASSUNTO → raio-alvo 300
      const nodes = [
        hnode("a", 0, 0, "ASSUNTO", { parentId: undefined, clusterId: "a" }),
        hnode("t", 50, 0, "TOPICO", { parentId: "a", clusterId: "a" }),
      ];
      const { nodes: out } = runUntilStable(nodes, [], orbitalOnly());
      const d = dist(find(out, "a"), find(out, "t"));
      expect(Math.abs(d - 300)).toBeLessThan(50);
    });

    it("conceito orbita mais perto que tópico (anéis aninhados)", () => {
      const topico = [
        hnode("a", 0, 0, "ASSUNTO", { clusterId: "a" }),
        hnode("t", 50, 0, "TOPICO", { parentId: "a", clusterId: "a" }),
      ];
      const conceito = [
        hnode("t", 0, 0, "TOPICO", { clusterId: "a" }),
        hnode("c", 50, 0, "CONCEITO", { parentId: "t", clusterId: "a" }),
      ];
      const dT = dist(...(runUntilStable(topico, [], orbitalOnly()).nodes as [any, any]));
      const dC = dist(...(runUntilStable(conceito, [], orbitalOnly()).nodes as [any, any]));
      // raio do tópico (300) > raio do conceito (180)
      expect(dT).toBeGreaterThan(dC);
    });

    it("assuntos distintos (nível 0) se separam com a repulsão de cluster", () => {
      const make = () => [
        hnode("a1", -20, 0, "ASSUNTO", { clusterId: "a1", subtreeIds: ["a1", undefined, undefined] }),
        hnode("c1", -10, 5, "CONCEITO", { parentId: "a1", clusterId: "a1", subtreeIds: ["a1", undefined, "c1"] }),
        hnode("a2", 20, 0, "ASSUNTO", { clusterId: "a2", subtreeIds: ["a2", undefined, undefined] }),
        hnode("c2", 10, -5, "CONCEITO", { parentId: "a2", clusterId: "a2", subtreeIds: ["a2", undefined, "c2"] }),
      ];
      const sep = (arr: any[]) => {
        const c1 = centroid(arr.filter((nd) => nd.clusterId === "a1"));
        const c2 = centroid(arr.filter((nd) => nd.clusterId === "a2"));
        return dist(c1, c2);
      };
      const withRep = runUntilStable(make(), [], opts({ clusterBy: "hierarchy", clusterRepulsion: 20000 })).nodes;
      const noRep = runUntilStable(make(), [], opts({ clusterBy: "hierarchy", clusterRepulsion: 0, clusterStrength: 0 })).nodes;
      expect(sep(withRep)).toBeGreaterThan(sep(noRep));
    });

    it("tópicos-irmãos (nível 1) formam subclusters separados DENTRO do assunto", () => {
      // um assunto, dois tópicos, cada tópico com um conceito. A repulsão
      // aninhada deve afastar a subárvore do t1 da subárvore do t2.
      const make = () => [
        hnode("a", 0, 0, "ASSUNTO", { clusterId: "a", subtreeIds: ["a", undefined, undefined] }),
        hnode("t1", 10, 4, "TOPICO", { parentId: "a", clusterId: "a", subtreeIds: ["a", "t1", undefined] }),
        hnode("c1", 14, 6, "CONCEITO", { parentId: "t1", clusterId: "a", subtreeIds: ["a", "t1", "c1"] }),
        hnode("t2", 8, -5, "TOPICO", { parentId: "a", clusterId: "a", subtreeIds: ["a", "t2", undefined] }),
        hnode("c2", 12, -7, "CONCEITO", { parentId: "t2", clusterId: "a", subtreeIds: ["a", "t2", "c2"] }),
      ];
      const sep = (arr: any[]) => {
        const s1 = centroid(arr.filter((nd) => nd.subtreeIds?.[1] === "t1"));
        const s2 = centroid(arr.filter((nd) => nd.subtreeIds?.[1] === "t2"));
        return dist(s1, s2);
      };
      const withRep = runUntilStable(make(), [], opts({ clusterBy: "hierarchy", clusterRepulsion: 20000 })).nodes;
      const noRep = runUntilStable(make(), [], opts({ clusterBy: "hierarchy", clusterRepulsion: 0, clusterStrength: 0 })).nodes;
      expect(sep(withRep)).toBeGreaterThan(sep(noRep));
    });

    it("não deriva: o centro de massa de uma árvore hierárquica fica parado", () => {
      // regressão: a força orbital (reação amortecida) e a gravidade central
      // (gFactor por filho/raiz) injetavam força líquida → o grafo derivava
      // infinitamente numa direção. O centro de massa deve permanecer estável.
      const nodes = [
        hnode("a", 0, 0, "ASSUNTO", { clusterId: "a", subtreeIds: ["a", undefined, undefined] }),
        hnode("t1", 40, 5, "TOPICO", { parentId: "a", clusterId: "a", subtreeIds: ["a", "t1", undefined] }),
        hnode("t2", 35, -8, "TOPICO", { parentId: "a", clusterId: "a", subtreeIds: ["a", "t2", undefined] }),
        hnode("c1", 60, 10, "CONCEITO", { parentId: "t1", clusterId: "a", subtreeIds: ["a", "t1", "c1"] }),
        hnode("f1", 70, 12, "FLASHCARD", { parentId: "c1", clusterId: "a", subtreeIds: ["a", "t1", "c1"] }),
        hnode("f2", 72, 9, "NOTA", { parentId: "c1", clusterId: "a", subtreeIds: ["a", "t1", "c1"] }),
      ];
      const c0 = centroid(nodes);
      const out = run(nodes, [], 1500, opts()); // DEFAULT = hierárquico
      const c1 = centroid(out);
      // sem a correção de deriva, c1.x crescia centenas/milhares de px
      expect(Math.abs(c1.x - c0.x)).toBeLessThan(20);
      expect(Math.abs(c1.y - c0.y)).toBeLessThan(20);
    });

    it("nó fixo nunca se move e ancora os vizinhos em órbita", () => {
      const nodes = [
        hnode("root", 0, 0, "ASSUNTO", { fixed: true }),
        hnode("a", 30, 0, "ASSUNTO", { parentId: "root", clusterId: "a", subtreeIds: ["a", undefined, undefined] }),
      ];
      const { nodes: out } = runUntilStable(nodes, [], opts());
      const root = find(out, "root");
      // o nó fixo permanece exatamente onde estava
      expect(root.x).toBe(0);
      expect(root.y).toBe(0);
      // o assunto assenta perto do raio-alvo orbital (560) ao redor do fixo
      const d = dist(root, find(out, "a"));
      expect(Math.abs(d - 560)).toBeLessThan(120);
    });

    it("clusterBy 'group' agrupa por tipo, não por clusterId", () => {
      // dois assuntos: em modo 'group' os DOIS assuntos são atraídos um ao outro
      // (mesmo tipo), reduzindo a distância entre eles ao longo do tempo.
      const nodes = [
        hnode("a1", -200, 0, "ASSUNTO", { clusterId: "a1" }),
        hnode("a2", 200, 0, "ASSUNTO", { clusterId: "a2" }),
      ];
      const d0 = dist(nodes[0], nodes[1]);
      const out = runUntilStable(nodes, [], opts({
        clusterBy: "group", clusterStrength: 1, clusterRepulsion: 0, damping: 0.3,
        gravitationalConstant: 0, centralGravity: 0, minGap: 0, avoidOverlap: 0,
      })).nodes;
      expect(dist(find(out, "a1"), find(out, "a2"))).toBeLessThan(d0);
    });
  });
});
