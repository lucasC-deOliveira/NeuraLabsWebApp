import { describe, it, expect, vi, afterEach } from "vitest";
import { detectCommunities, detectGaps, type Community } from "./graph-communities";
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";
import type { GraphEdgeType } from "@/lib/graph-api";

// ── factories ─────────────────────────────────────────────────────────────────

function node(id: string, group = "CONCEITO", x = 0, y = 0): SimNode {
  return {
    id, label: id, group, dominio: 0, x, y,
    vx: 0, vy: 0, tipoReal: group, prioridadeRevisao: 0,
    width: 100, height: 40,
  };
}

function edge(source: string, target: string, type = "RELACIONADO"): GraphEdgeType {
  return { source, target, type, peso: 1 };
}

// Monta comunidade manual para testes de detectGaps
function makeCommunity(id: string, nodes: SimNode[], color = "#000"): Community {
  return { id, nodes, color, label: `Cluster ${id}` };
}

// ── detectCommunities ─────────────────────────────────────────────────────────

describe("detectCommunities", () => {
  afterEach(() => vi.restoreAllMocks());

  it("retorna array vazio para grafo sem nós", () => {
    expect(detectCommunities([], [])).toEqual([]);
  });

  it("único nó sem arestas → 1 comunidade com 1 nó", () => {
    const result = detectCommunities([node("A")], []);
    expect(result).toHaveLength(1);
    expect(result[0].nodes).toHaveLength(1);
    expect(result[0].nodes[0].id).toBe("A");
  });

  it("nós completamente isolados (sem arestas) → cada nó em comunidade própria", () => {
    const nodes = [node("A"), node("B"), node("C")];
    const result = detectCommunities(nodes, []);
    expect(result).toHaveLength(3);
  });

  it("dois componentes desconectados → sempre 2 comunidades", () => {
    // Componente 1: A-B, Componente 2: C-D
    const nodes = [node("A"), node("B"), node("C"), node("D")];
    const edges = [edge("A", "B"), edge("C", "D")];
    // Resultado é não-determinístico em qual rótulo "ganha", mas sempre 2 comunidades
    const result = detectCommunities(nodes, edges);
    expect(result).toHaveLength(2);
  });

  it("dois componentes desconectados → nós do mesmo componente ficam juntos", () => {
    const nodes = [node("A"), node("B"), node("C"), node("D")];
    const edges = [edge("A", "B"), edge("C", "D")];
    const result = detectCommunities(nodes, edges);

    // Os ids de cada comunidade devem ser {A,B} ou {C,D}
    const sets = result.map((c) => new Set(c.nodes.map((n) => n.id)));
    const ab = new Set(["A", "B"]);
    const cd = new Set(["C", "D"]);
    const hasAB = sets.some((s) => s.size === ab.size && [...ab].every((x) => s.has(x)));
    const hasCD = sets.some((s) => s.size === cd.size && [...cd].every((x) => s.has(x)));
    expect(hasAB).toBe(true);
    expect(hasCD).toBe(true);
  });

  it("comunidades ordenadas por tamanho decrescente", () => {
    // Componente grande: A-B-C (3 nós); componente pequeno: D-E (2 nós)
    const nodes = [node("A"), node("B"), node("C"), node("D"), node("E")];
    const edges = [edge("A", "B"), edge("B", "C"), edge("D", "E")];
    const result = detectCommunities(nodes, edges);
    expect(result[0].nodes.length).toBeGreaterThanOrEqual(result[1].nodes.length);
  });

  it("grafo completamente conectado (6 arestas em 4 nós) → 1 comunidade", () => {
    const nodes = [node("A"), node("B"), node("C"), node("D")];
    const edges = [
      edge("A", "B"), edge("A", "C"), edge("A", "D"),
      edge("B", "C"), edge("B", "D"), edge("C", "D"),
    ];
    const result = detectCommunities(nodes, edges);
    expect(result).toHaveLength(1);
    expect(result[0].nodes).toHaveLength(4);
  });

  it("cada comunidade recebe uma cor da paleta", () => {
    const nodes = [node("A"), node("B"), node("C"), node("D")];
    const result = detectCommunities(nodes, []);
    for (const c of result) {
      expect(c.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("label da comunidade inclui 'Cluster' e contagem de nós", () => {
    const nodes = [node("A"), node("B")];
    const result = detectCommunities(nodes, [edge("A", "B")]);
    expect(result[0].label).toMatch(/Cluster 1/);
    expect(result[0].label).toContain("2 nós");
  });

  it("cada comunidade recebe id único", () => {
    const nodes = [node("A"), node("B"), node("C"), node("D")];
    const result = detectCommunities(nodes, [edge("A", "B"), edge("C", "D")]);
    const ids = result.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("respeita maxIterations: valor 0 retorna N comunidades (sem convergência)", () => {
    // Com 0 iterações cada nó mantém seu próprio id como rótulo
    const nodes = [node("A"), node("B"), node("C")];
    const edges = [edge("A", "B"), edge("B", "C")];
    const result = detectCommunities(nodes, edges, 0);
    expect(result).toHaveLength(3);
  });
});

// ── detectGaps ────────────────────────────────────────────────────────────────

describe("detectGaps", () => {
  it("menos de 2 comunidades → sem lacunas", () => {
    const nodes = [node("A"), node("B")];
    const c = makeCommunity("0", nodes);
    expect(detectGaps([c], [])).toEqual([]);
    expect(detectGaps([], [])).toEqual([]);
  });

  it("comunidade com < 2 nós é ignorada na detecção de lacunas", () => {
    const single = makeCommunity("0", [node("A")]);
    const pair   = makeCommunity("1", [node("B"), node("C")]);
    // single tem apenas 1 nó → não forma lacuna
    expect(detectGaps([single, pair], [])).toEqual([]);
  });

  it("2 comunidades conectadas por aresta → nenhuma lacuna", () => {
    const nodesA = [node("A"), node("B")];
    const nodesB = [node("C"), node("D")];
    const cA = makeCommunity("0", nodesA);
    const cB = makeCommunity("1", nodesB);
    // Aresta A→C liga as duas comunidades
    const edges = [edge("A", "C")];
    expect(detectGaps([cA, cB], edges)).toEqual([]);
  });

  it("2 comunidades sem nenhuma aresta entre si → 1 lacuna", () => {
    const nodesA = [node("A"), node("B")];
    const nodesB = [node("C"), node("D")];
    const cA = makeCommunity("0", nodesA);
    const cB = makeCommunity("1", nodesB);
    // Aresta interna (A→B) não conecta comunidades
    const gaps = detectGaps([cA, cB], [edge("A", "B"), edge("C", "D")]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].communityA).toBe(cA);
    expect(gaps[0].communityB).toBe(cB);
  });

  it("bridge nodes são o par mais próximo por distância euclidiana", () => {
    // A1(0,0) A2(5,0) | B1(10,0) B2(100,0)
    // Distâncias: A1-B1=10, A1-B2=100, A2-B1=5 (mínimo), A2-B2=95
    const a1 = node("A1", "CONCEITO",   0, 0);
    const a2 = node("A2", "CONCEITO",   5, 0);
    const b1 = node("B1", "CONCEITO",  10, 0);
    const b2 = node("B2", "CONCEITO", 100, 0);
    const cA = makeCommunity("0", [a1, a2]);
    const cB = makeCommunity("1", [b1, b2]);
    const [gap] = detectGaps([cA, cB], []);
    expect(gap.bridgeA.id).toBe("A2");
    expect(gap.bridgeB.id).toBe("B1");
  });

  it("bridge é simétrico: bridgeA pertence a communityA, bridgeB a communityB", () => {
    const nodesA = [node("A1", "CONCEITO", 0, 0), node("A2", "CONCEITO", 1, 0)];
    const nodesB = [node("B1", "CONCEITO", 50, 0), node("B2", "CONCEITO", 51, 0)];
    const cA = makeCommunity("0", nodesA);
    const cB = makeCommunity("1", nodesB);
    const [gap] = detectGaps([cA, cB], []);
    const aIds = new Set(nodesA.map((n) => n.id));
    const bIds = new Set(nodesB.map((n) => n.id));
    expect(aIds.has(gap.bridgeA.id)).toBe(true);
    expect(bIds.has(gap.bridgeB.id)).toBe(true);
  });

  it("3 comunidades: A↔B conectadas, C desconectada → 2 lacunas (A-C e B-C)", () => {
    const nodesA = [node("A1"), node("A2")];
    const nodesB = [node("B1"), node("B2")];
    const nodesC = [node("C1"), node("C2")];
    const cA = makeCommunity("0", nodesA);
    const cB = makeCommunity("1", nodesB);
    const cC = makeCommunity("2", nodesC);
    // A↔B conectadas
    const edges = [edge("A1", "B1")];
    const gaps = detectGaps([cA, cB, cC], edges);
    expect(gaps).toHaveLength(2);
    const pairs = gaps.map((g) => [g.communityA.id, g.communityB.id].sort().join("-")).sort();
    expect(pairs).toContain("0-2"); // A-C
    expect(pairs).toContain("1-2"); // B-C
  });

  it("aresta no sentido inverso também é reconhecida como conexão", () => {
    const nodesA = [node("A1"), node("A2")];
    const nodesB = [node("B1"), node("B2")];
    const cA = makeCommunity("0", nodesA);
    const cB = makeCommunity("1", nodesB);
    // Aresta de B para A (sentido inverso)
    expect(detectGaps([cA, cB], [edge("B1", "A1")])).toHaveLength(0);
  });

  it("aresta entre nós da MESMA comunidade não é contada como conexão entre clusters", () => {
    const nodesA = [node("A1"), node("A2")];
    const nodesB = [node("B1"), node("B2")];
    const cA = makeCommunity("0", nodesA);
    const cB = makeCommunity("1", nodesB);
    // Aresta interna A1→A2
    const gaps = detectGaps([cA, cB], [edge("A1", "A2")]);
    expect(gaps).toHaveLength(1);
  });
});
