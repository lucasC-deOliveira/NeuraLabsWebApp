// Detecção de comunidades (Label Propagation) e lacunas estruturais (Gap Detection).
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";
import type { GraphEdgeType } from "@/lib/graph-api";

export interface Community {
  id: string;
  nodes: SimNode[];
  color: string;
  label: string;
}

export interface StructuralGap {
  communityA: Community;
  communityB: Community;
  bridgeA: SimNode; // nó de A mais próximo de B no layout
  bridgeB: SimNode; // nó de B mais próximo de A no layout
}

const COMMUNITY_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#14b8a6",
];

const TYPE_PT: Record<string, string> = {
  ASSUNTO: "assuntos", TOPICO: "tópicos", CONCEITO: "conceitos",
  FLASHCARD: "flashcards", NOTA: "notas", TEXTO_BRUTO: "textos", BARALHO: "baralhos",
};

// PRNG xorshift32 com semente derivada da topologia — determinístico para o mesmo grafo
function makeRng(nodes: SimNode[], edges: GraphEdgeType[]) {
  let s = 0x9e3779b9;
  for (const n of nodes) for (let i = 0; i < n.id.length; i++) s = Math.imul(s ^ n.id.charCodeAt(i), 0x45d9f3b) | 0;
  for (const e of edges) { s = Math.imul(s ^ e.source.length, 0x45d9f3b) | 0; s = Math.imul(s ^ e.target.length, 0x45d9f3b) | 0; }
  s = s >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0x100000000; };
}

// Label Propagation — O(iter × E)
export function detectCommunities(
  nodes: SimNode[],
  edges: GraphEdgeType[],
  maxIterations = 50,
): Community[] {
  if (nodes.length === 0) return [];

  const rand = makeRng(nodes, edges);

  // Adjacência não-direcionada
  const adj = new Map<string, string[]>(nodes.map(n => [n.id, []]));
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  }

  // Cada nó começa com seu próprio rótulo
  const label = new Map<string, string>(nodes.map(n => [n.id, n.id]));
  const ids = nodes.map(n => n.id);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Embaralhar com PRNG determinístico (mesmo grafo = mesma ordem = mesmo resultado)
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    let changed = false;
    for (const id of ids) {
      const neighbors = adj.get(id) ?? [];
      if (!neighbors.length) continue;

      const freq = new Map<string, number>();
      for (const nb of neighbors) {
        const l = label.get(nb) ?? nb;
        freq.set(l, (freq.get(l) ?? 0) + 1);
      }

      let maxF = 0;
      const best: string[] = [];
      for (const [l, f] of freq) {
        if (f > maxF) { maxF = f; best.length = 0; best.push(l); }
        else if (f === maxF) best.push(l);
      }
      // Desempate determinístico: menor índice lexicográfico do array best
      const chosen = best.sort()[0];
      if (chosen !== label.get(id)) { label.set(id, chosen); changed = true; }
    }
    if (!changed) break;
  }

  // Agrupar por rótulo final
  const groups = new Map<string, SimNode[]>();
  for (const n of nodes) {
    const l = label.get(n.id) ?? n.id;
    const arr = groups.get(l) ?? [];
    arr.push(n);
    groups.set(l, arr);
  }

  return [...groups.values()]
    .sort((a, b) => b.length - a.length)
    .map((clusterNodes, i) => {
      // Tipo dominante no cluster
      const freq = new Map<string, number>();
      for (const n of clusterNodes) freq.set(n.group, (freq.get(n.group) ?? 0) + 1);
      const dominant = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      return {
        id: String(i),
        nodes: clusterNodes,
        color: COMMUNITY_COLORS[i % COMMUNITY_COLORS.length],
        label: `Cluster ${i + 1} · ${clusterNodes.length} nós · ${TYPE_PT[dominant] ?? dominant}`,
      };
    });
}

// Clusters hierárquicos: um cluster principal por ASSUNTO (a raiz da árvore),
// contendo toda a sua subárvore (tópicos, conceitos e nós comuns). Usa o
// `clusterId` já derivado e anexado a cada SimNode pelo layout — não recomputa
// a hierarquia. Nós sem cluster (folhas órfãs sem conceito acima) ficam de fora,
// pois folhas nunca formam cluster próprio. Mesma forma de `Community`, então
// alimenta o painel, o destaque, a criação de baralho e o resumo sem mudanças.
export function clustersFromHierarchy(nodes: SimNode[]): Community[] {
  if (nodes.length === 0) return [];

  const byCluster = new Map<string, SimNode[]>();
  for (const n of nodes) {
    const cid = n.clusterId;
    if (!cid) continue; // folha órfã / sem cluster
    const arr = byCluster.get(cid) ?? [];
    arr.push(n);
    byCluster.set(cid, arr);
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  return [...byCluster.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([cid, clusterNodes], i) => {
      const root = nodeById.get(cid);
      const rootLabel = root?.label?.trim() || "Cluster";
      const fcCount = clusterNodes.filter((n) => n.group === "FLASHCARD").length;
      return {
        id: cid,
        nodes: clusterNodes,
        color: COMMUNITY_COLORS[i % COMMUNITY_COLORS.length],
        label: `${rootLabel} · ${clusterNodes.length} nós${fcCount ? ` · ${fcCount} flashcards` : ""}`,
      };
    });
}

// Detecta pares de comunidades sem nenhuma aresta entre si (lacunas estruturais).
export function detectGaps(communities: Community[], edges: GraphEdgeType[]): StructuralGap[] {
  if (communities.length < 2) return [];

  const nodeToComm = new Map<string, number>();
  communities.forEach((c, i) => c.nodes.forEach(n => nodeToComm.set(n.id, i)));

  const connected = new Set<string>();
  for (const e of edges) {
    const ci = nodeToComm.get(e.source);
    const cj = nodeToComm.get(e.target);
    if (ci !== undefined && cj !== undefined && ci !== cj) {
      connected.add(`${Math.min(ci, cj)}-${Math.max(ci, cj)}`);
    }
  }

  const gaps: StructuralGap[] = [];
  for (let i = 0; i < communities.length; i++) {
    for (let j = i + 1; j < communities.length; j++) {
      if (communities[i].nodes.length < 2 || communities[j].nodes.length < 2) continue;
      if (connected.has(`${i}-${j}`)) continue;

      // Par de nós mais próximos no layout (ponte potencial)
      let minDist = Infinity;
      let bridgeA = communities[i].nodes[0];
      let bridgeB = communities[j].nodes[0];
      for (const na of communities[i].nodes) {
        for (const nb of communities[j].nodes) {
          const d = Math.hypot(na.x - nb.x, na.y - nb.y);
          if (d < minDist) { minDist = d; bridgeA = na; bridgeB = nb; }
        }
      }
      gaps.push({ communityA: communities[i], communityB: communities[j], bridgeA, bridgeB });
    }
  }
  return gaps;
}
