import { describe, it, expect } from "vitest";
import { computeBetweenness, computeGraphMetrics } from "./graph-metrics";
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";
import type { GraphEdgeType } from "@/lib/graph-api";

// ── factories ─────────────────────────────────────────────────────────────────

function node(
  id: string,
  group = "CONCEITO",
  dominio = 0,
  prioridadeRevisao = 0,
): SimNode {
  return {
    id, label: id, group, dominio, x: 0, y: 0,
    vx: 0, vy: 0, tipoReal: group, prioridadeRevisao,
    width: 100, height: 40,
  };
}

function edge(source: string, target: string): GraphEdgeType {
  return { source, target, type: "RELACIONADO", peso: 1 };
}

// ── computeBetweenness ────────────────────────────────────────────────────────

describe("computeBetweenness", () => {
  it("N < 3 → todos os scores são 0", () => {
    const result = computeBetweenness([node("A"), node("B")], [edge("A", "B")]);
    expect(result.get("A")).toBe(0);
    expect(result.get("B")).toBe(0);
  });

  it("N = 0 → map vazio", () => {
    const result = computeBetweenness([], []);
    expect(result.size).toBe(0);
  });

  it("mapa retornado cobre todos os nós", () => {
    const nodes = [node("A"), node("B"), node("C")];
    const result = computeBetweenness(nodes, [edge("A", "B"), edge("B", "C")]);
    expect(result.has("A")).toBe(true);
    expect(result.has("B")).toBe(true);
    expect(result.has("C")).toBe(true);
  });

  it("linha A-B-C → B tem maior betweenness, A e C têm 0", () => {
    const nodes = [node("A"), node("B"), node("C")];
    const edges = [edge("A", "B"), edge("B", "C")];
    const result = computeBetweenness(nodes, edges);
    expect(result.get("B")!).toBeGreaterThan(result.get("A")!);
    expect(result.get("B")!).toBeGreaterThan(result.get("C")!);
    expect(result.get("A")).toBe(0);
    expect(result.get("C")).toBe(0);
  });

  it("grafo estrela (A=centro, B/C/D=pontas) → A tem maior betweenness, pontas têm 0", () => {
    const nodes = [node("A"), node("B"), node("C"), node("D")];
    const edges = [edge("A", "B"), edge("A", "C"), edge("A", "D")];
    const result = computeBetweenness(nodes, edges);
    expect(result.get("A")!).toBeGreaterThan(0);
    expect(result.get("B")).toBe(0);
    expect(result.get("C")).toBe(0);
    expect(result.get("D")).toBe(0);
  });

  it("triângulo A-B-C → todos com mesmo score (simetria)", () => {
    const nodes = [node("A"), node("B"), node("C")];
    const edges = [edge("A", "B"), edge("B", "C"), edge("A", "C")];
    const result = computeBetweenness(nodes, edges);
    const a = result.get("A")!;
    const b = result.get("B")!;
    const c = result.get("C")!;
    expect(Math.abs(a - b)).toBeLessThan(1e-9);
    expect(Math.abs(b - c)).toBeLessThan(1e-9);
  });

  it("nós desconectados (sem arestas) → todos com score 0", () => {
    const nodes = [node("A"), node("B"), node("C")];
    const result = computeBetweenness(nodes, []);
    expect(result.get("A")).toBe(0);
    expect(result.get("B")).toBe(0);
    expect(result.get("C")).toBe(0);
  });

  it("cadeia longa A-B-C-D-E → nós centrais têm score maior que os extremos", () => {
    const nodes = [node("A"), node("B"), node("C"), node("D"), node("E")];
    const edges = [edge("A", "B"), edge("B", "C"), edge("C", "D"), edge("D", "E")];
    const result = computeBetweenness(nodes, edges);
    // C (centro) deve ter maior betweenness que A e E (extremos)
    expect(result.get("C")!).toBeGreaterThan(result.get("A")!);
    expect(result.get("C")!).toBeGreaterThan(result.get("E")!);
    // Extremos têm betweenness 0
    expect(result.get("A")).toBe(0);
    expect(result.get("E")).toBe(0);
  });

  it("todos os scores são não-negativos", () => {
    const nodes = [node("A"), node("B"), node("C"), node("D")];
    const edges = [edge("A", "B"), edge("B", "C"), edge("C", "D")];
    const result = computeBetweenness(nodes, edges);
    for (const [, score] of result) {
      expect(score).toBeGreaterThanOrEqual(0);
    }
  });

  it("nó-ponte entre dois cliques tem betweenness maior que nós dentro dos cliques", () => {
    // Clique 1: A-B, A-C, B-C; Clique 2: D-E, D-F, E-F; ponte: C-D
    const nodes = [node("A"), node("B"), node("C"), node("D"), node("E"), node("F")];
    const edges = [
      edge("A", "B"), edge("A", "C"), edge("B", "C"),
      edge("D", "E"), edge("D", "F"), edge("E", "F"),
      edge("C", "D"),
    ];
    const result = computeBetweenness(nodes, edges);
    // C e D são as pontes
    expect(result.get("C")!).toBeGreaterThan(result.get("A")!);
    expect(result.get("D")!).toBeGreaterThan(result.get("E")!);
  });
});

// ── computeGraphMetrics ───────────────────────────────────────────────────────

// Grafo de teste: 4 nós, 2 tipos, 2 arestas, 1 nó isolado
// A(ASSUNTO) → B(TOPICO) → C(TOPICO), D(CONCEITO) isolado
const NODES = [
  node("A", "ASSUNTO", 0.0, 0),
  node("B", "TOPICO",  0.6, 2),
  node("C", "TOPICO",  0.9, 4),
  node("D", "CONCEITO", 0.0, 1),
];
const EDGES = [edge("A", "B"), edge("B", "C")];

describe("computeGraphMetrics — totais e KPIs", () => {
  const m = computeGraphMetrics(NODES, EDGES);

  it("totalNodes conta todos os nós", () => {
    expect(m.totalNodes).toBe(4);
  });

  it("totalEdges conta todas as arestas", () => {
    expect(m.totalEdges).toBe(2);
  });

  it("avgDegree = 2E/N", () => {
    // 2*2/4 = 1.0
    expect(m.avgDegree).toBeCloseTo(1.0, 1);
  });

  it("isolatedCount conta nós com grau 0", () => {
    // D não tem arestas
    expect(m.isolatedCount).toBe(1);
  });

  it("densityPct = 2E / (N*(N-1)) * 100, arredondado", () => {
    // 2*2 / (4*3) * 100 = 4/12 * 100 ≈ 33.3
    expect(m.densityPct).toBeCloseTo(33.3, 0);
  });

  it("healthScore está entre 0 e 100", () => {
    expect(m.healthScore).toBeGreaterThanOrEqual(0);
    expect(m.healthScore).toBeLessThanOrEqual(100);
  });
});

describe("computeGraphMetrics — distribuição por tipo", () => {
  const m = computeGraphMetrics(NODES, EDGES);

  it("nodesByType reflete a contagem real por tipo", () => {
    const topico = m.nodesByType.find((t) => t.name === "TOPICO");
    const assunto = m.nodesByType.find((t) => t.name === "ASSUNTO");
    const conceito = m.nodesByType.find((t) => t.name === "CONCEITO");
    expect(topico?.count).toBe(2);
    expect(assunto?.count).toBe(1);
    expect(conceito?.count).toBe(1);
  });

  it("nodesByType está ordenado por contagem decrescente", () => {
    const counts = m.nodesByType.map((t) => t.count);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    }
  });

  it("edgesByType lista o tipo de aresta correto", () => {
    expect(m.edgesByType[0].name).toBe("RELACIONADO");
    expect(m.edgesByType[0].count).toBe(2);
  });
});

describe("computeGraphMetrics — topHubs e betweennessTop", () => {
  const m = computeGraphMetrics(NODES, EDGES);

  it("topHubs lista no máximo 8 nós", () => {
    expect(m.topHubs.length).toBeLessThanOrEqual(8);
  });

  it("topHubs está ordenado por grau decrescente", () => {
    for (let i = 1; i < m.topHubs.length; i++) {
      expect(m.topHubs[i].degree).toBeLessThanOrEqual(m.topHubs[i - 1].degree);
    }
  });

  it("betweennessTop está ordenado por score decrescente", () => {
    for (let i = 1; i < m.betweennessTop.length; i++) {
      expect(m.betweennessTop[i].score).toBeLessThanOrEqual(m.betweennessTop[i - 1].score);
    }
  });

  it("betweennessTop inclui todos os campos necessários", () => {
    for (const entry of m.betweennessTop) {
      expect(typeof entry.id).toBe("string");
      expect(typeof entry.label).toBe("string");
      expect(typeof entry.group).toBe("string");
      expect(typeof entry.score).toBe("number");
    }
  });

  it("B (nó de passagem) tem maior betweenness que A e D no grafo linear", () => {
    const bEntry = m.betweennessTop.find((e) => e.id === "B");
    const aEntry = m.betweennessTop.find((e) => e.id === "A");
    expect(bEntry).toBeDefined();
    expect(bEntry!.score).toBeGreaterThanOrEqual(aEntry?.score ?? 0);
  });
});

describe("computeGraphMetrics — outliers", () => {
  const m = computeGraphMetrics(NODES, EDGES);

  it("orphans lista nós com grau 0", () => {
    const ids = m.orphans.map((n) => n.id);
    expect(ids).toContain("D");
    expect(ids).not.toContain("A");
    expect(ids).not.toContain("B");
  });
});

describe("computeGraphMetrics — grafo vazio", () => {
  const m = computeGraphMetrics([], []);

  it("grafo vazio retorna zeros em todos os KPIs", () => {
    expect(m.totalNodes).toBe(0);
    expect(m.totalEdges).toBe(0);
    expect(m.avgDegree).toBe(0);
    expect(m.isolatedCount).toBe(0);
    expect(m.densityPct).toBe(0);
    expect(m.healthScore).toBe(0);
  });

  it("grafo vazio tem listas vazias", () => {
    expect(m.nodesByType).toHaveLength(0);
    expect(m.orphans).toHaveLength(0);
    expect(m.topHubs).toHaveLength(0);
    expect(m.betweennessTop).toHaveLength(0);
  });
});

describe("computeGraphMetrics — maestria e radar", () => {
  const m = computeGraphMetrics(NODES, EDGES);

  it("dominioByType calcula média correta para TOPICO (média de 0.6 e 0.9)", () => {
    const topico = m.dominioByType.find((t) => t.type === "TOPICO");
    // (0.6 + 0.9) / 2 * 100 = 75
    expect(topico?.dominio).toBe(75);
  });

  it("radarData inclui todos os tipos presentes no grafo", () => {
    const tipos = m.radarData.map((r) => r.type);
    // TYPE_LABELS translates group keys
    expect(tipos).toContain("Assunto");
    expect(tipos).toContain("Tópico");
    expect(tipos).toContain("Conceito");
  });

  it("radarData tem maestria e conectividade entre 0 e 100", () => {
    for (const entry of m.radarData) {
      expect(entry.maestria).toBeGreaterThanOrEqual(0);
      expect(entry.maestria).toBeLessThanOrEqual(100);
      expect(entry.conectividade).toBeGreaterThanOrEqual(0);
      expect(entry.conectividade).toBeLessThanOrEqual(100);
    }
  });
});

describe("computeGraphMetrics — scatter", () => {
  const m = computeGraphMetrics(NODES, EDGES);

  it("scatter tem uma entrada por nó", () => {
    expect(m.scatter).toHaveLength(NODES.length);
  });

  it("scatter trunca labels longas em 24 caracteres + reticências", () => {
    const longLabel = "a".repeat(30);
    const nodeWithLongLabel: SimNode = { ...NODES[0], id: "long", label: longLabel };
    const result = computeGraphMetrics([nodeWithLongLabel], []);
    expect(result.scatter[0].label.length).toBeLessThanOrEqual(25);
    expect(result.scatter[0].label.endsWith("…")).toBe(true);
  });

  it("scatter não trunca labels com até 24 chars", () => {
    const shortLabel = "a".repeat(24);
    const n: SimNode = { ...NODES[0], id: "short", label: shortLabel };
    const result = computeGraphMetrics([n], []);
    expect(result.scatter[0].label).toBe(shortLabel);
    expect(result.scatter[0].label.endsWith("…")).toBe(false);
  });
});

describe("computeGraphMetrics — histograma de grau", () => {
  it("bucket '0' conta nós com grau 0", () => {
    const m = computeGraphMetrics(NODES, EDGES);
    const zeroBucket = m.degreeHistogram.find((b) => b.bucket === "0");
    expect(zeroBucket?.count).toBe(1); // apenas D
  });

  it("bucket '2' conta nós com grau 2", () => {
    const m = computeGraphMetrics(NODES, EDGES);
    // B tem grau 2 (A→B e B→C)
    const twoBucket = m.degreeHistogram.find((b) => b.bucket === "2");
    expect(twoBucket?.count).toBe(1);
  });

  it("histograma tem exatamente 6 buckets (0,1,2,3,4,5+)", () => {
    const m = computeGraphMetrics(NODES, EDGES);
    expect(m.degreeHistogram).toHaveLength(6);
    expect(m.degreeHistogram[5].bucket).toBe("5+");
  });
});
