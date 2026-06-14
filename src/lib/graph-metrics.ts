// Métricas de teoria dos grafos e ciência de dados aplicadas ao grafo de conhecimento.
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";
import type { GraphEdgeType } from "@/lib/graph-api";

export interface GraphMetrics {
  // KPIs
  totalNodes: number;
  totalEdges: number;
  avgDegree: number;
  isolatedCount: number;
  densityPct: number;        // 0-100
  healthScore: number;       // 0-100 composite

  // distribuição
  nodesByType: { name: string; label: string; count: number; color: string }[];
  edgesByType: { name: string; count: number }[];

  // conectividade
  degreeHistogram: { bucket: string; count: number }[];
  topHubs: { id: string; label: string; group: string; degree: number; centrality: number }[];

  // maestria
  dominioByType: { type: string; label: string; dominio: number; color: string }[];

  // radar multi-série: maestria × conectividade por tipo (0-100 normalizado)
  radarData: { type: string; maestria: number; conectividade: number }[];

  // matrix domínio × prioridade (knowledge gap analysis)
  scatter: { id: string; label: string; group: string; color: string; dominio: number; prioridade: number }[];

  // outliers
  orphans: { id: string; label: string; group: string }[];
  hubs: { id: string; label: string; degree: number }[];   // degree > mean+2σ
}

const TYPE_LABELS: Record<string, string> = {
  ASSUNTO: "Assunto", TOPICO: "Tópico", CONCEITO: "Conceito",
  FLASHCARD: "Flashcard", NOTA: "Nota", TEXTO_BRUTO: "Texto bruto", BARALHO: "Baralho",
};

// cores border do tema light (para os gráficos)
const TYPE_COLORS: Record<string, string> = {
  ASSUNTO:     "#4338ca",
  TOPICO:      "#0369a1",
  CONCEITO:    "#059669",
  FLASHCARD:   "#eab308",
  NOTA:        "#9333ea",
  TEXTO_BRUTO: "#475569",
  BARALHO:     "#ea580c",
};

export function computeGraphMetrics(nodes: SimNode[], edges: GraphEdgeType[]): GraphMetrics {
  const N = nodes.length;
  const E = edges.length;

  // ---- grau por nó ----
  const degMap = new Map<string, number>(nodes.map(n => [n.id, 0]));
  for (const e of edges) {
    degMap.set(e.source, (degMap.get(e.source) ?? 0) + 1);
    degMap.set(e.target, (degMap.get(e.target) ?? 0) + 1);
  }

  const degrees = nodes.map(n => degMap.get(n.id) ?? 0);
  const avgDegree = N > 0 ? (E * 2) / N : 0;
  const isolatedCount = degrees.filter(d => d === 0).length;
  const density = N > 1 ? (2 * E) / (N * (N - 1)) : 0;

  // desvio padrão para detectar hubs
  const mean = avgDegree;
  const std = Math.sqrt(degrees.reduce((s, d) => s + (d - mean) ** 2, 0) / Math.max(N, 1));
  const hubThreshold = mean + 2 * std;

  // ---- composição por tipo ----
  const typeCount = new Map<string, number>();
  for (const n of nodes) typeCount.set(n.group, (typeCount.get(n.group) ?? 0) + 1);
  const nodesByType = [...typeCount.entries()]
    .map(([name, count]) => ({ name, label: TYPE_LABELS[name] ?? name, count, color: TYPE_COLORS[name] ?? "#888" }))
    .sort((a, b) => b.count - a.count);

  // ---- tipos de aresta ----
  const edgeTypeCount = new Map<string, number>();
  for (const e of edges) edgeTypeCount.set(e.type, (edgeTypeCount.get(e.type) ?? 0) + 1);
  const edgesByType = [...edgeTypeCount.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ---- histograma de grau ----
  const buckets = [0, 0, 0, 0, 0, 0]; // 0,1,2,3,4,5+
  for (const d of degrees) buckets[Math.min(d, 5)]++;
  const degreeHistogram = buckets.map((count, i) => ({ bucket: i === 5 ? "5+" : String(i), count }));

  // ---- hubs: top 8 por grau ----
  const topHubs = nodes
    .map(n => ({ id: n.id, label: n.label, group: n.group, degree: degMap.get(n.id) ?? 0, centrality: N > 1 ? (degMap.get(n.id) ?? 0) / (N - 1) : 0 }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 8);

  // ---- maestria média por tipo ----
  const domByType = new Map<string, number[]>();
  const degByType = new Map<string, number[]>();
  for (const n of nodes) {
    const arr = domByType.get(n.group) ?? [];
    arr.push(n.dominio);
    domByType.set(n.group, arr);
    const darr = degByType.get(n.group) ?? [];
    darr.push(degMap.get(n.id) ?? 0);
    degByType.set(n.group, darr);
  }
  const dominioByType = [...domByType.entries()].map(([type, arr]) => ({
    type,
    label: TYPE_LABELS[type] ?? type,
    dominio: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100),
    color: TYPE_COLORS[type] ?? "#888",
  }));

  // radar multi-série: maestria × conectividade por tipo
  const allTypes = [...new Set(nodes.map(n => n.group))];
  const maxAvgDeg = Math.max(
    ...allTypes.map(t => {
      const arr = degByType.get(t) ?? [0];
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    }),
    1,
  );
  const radarData = allTypes.map(t => {
    const dArr = domByType.get(t) ?? [0];
    const cArr = degByType.get(t) ?? [0];
    const avgDom = dArr.reduce((a, b) => a + b, 0) / dArr.length;
    const avgCon = cArr.reduce((a, b) => a + b, 0) / cArr.length;
    return {
      type: TYPE_LABELS[t] ?? t,
      maestria: Math.round(avgDom * 100),
      conectividade: Math.round((avgCon / maxAvgDeg) * 100),
    };
  });

  // ---- scatter: domínio × prioridade ----
  const scatter = nodes.map(n => ({
    id: n.id,
    label: n.label.length > 24 ? n.label.slice(0, 24) + "…" : n.label,
    group: n.group,
    color: TYPE_COLORS[n.group] ?? "#888",
    dominio: Math.round(n.dominio * 100),
    prioridade: Math.round(n.prioridadeRevisao * 10) / 10,
  }));

  // ---- outliers ----
  const orphans = nodes
    .filter(n => (degMap.get(n.id) ?? 0) === 0)
    .map(n => ({ id: n.id, label: n.label, group: n.group }));

  const hubs = nodes
    .filter(n => (degMap.get(n.id) ?? 0) > hubThreshold)
    .map(n => ({ id: n.id, label: n.label, degree: degMap.get(n.id) ?? 0 }));

  // ---- health score (0-100) ----
  // pesos: cobertura de tipos (30%), conectividade (30%), maestria média (40%)
  const typeVariety = Math.min(typeCount.size / 4, 1); // 4+ tipos = 100%
  const connectivity = N > 0 ? Math.min(1 - isolatedCount / N, 1) : 0;
  const avgDominio = N > 0 ? nodes.reduce((s, n) => s + n.dominio, 0) / N : 0;
  const healthScore = Math.round((typeVariety * 30 + connectivity * 30 + avgDominio * 40));

  return {
    totalNodes: N,
    totalEdges: E,
    avgDegree: Math.round(avgDegree * 10) / 10,
    isolatedCount,
    densityPct: Math.round(density * 1000) / 10,
    healthScore,
    nodesByType,
    edgesByType,
    degreeHistogram,
    topHubs,
    dominioByType,
    radarData,
    scatter,
    orphans,
    hubs,
  };
}
