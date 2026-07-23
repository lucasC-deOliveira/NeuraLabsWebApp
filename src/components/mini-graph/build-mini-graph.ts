import type { ConceptConnection, MiniEdge, MiniGraphModel, MiniNode } from "./mini-graph.types";

// Geometria do layout em camadas (colunas). Coordenadas em unidades de SVG.
const COL_W = 200;
const ROW_H = 48;
const X_PAD = 24;

// Dedup preservando a ordem de aparição; ignora vazios.
function unique(values: string[]): string[] {
  return [...new Set(values.filter((v) => v.length > 0))];
}

// id estável por camada+rótulo (o item raiz é sempre "root").
function nodeId(layer: number, label: string): string {
  return layer === 0 ? "root" : `${layer}:${label}`;
}

// Distribui os rótulos de uma camada verticalmente, centrados na altura total.
function placeLayer(labels: string[], layer: number, height: number): MiniNode[] {
  const x = layer * COL_W + X_PAD;
  const step = height / labels.length;
  return labels.map((label, i) => ({ id: nodeId(layer, label), label, layer, x, y: step * i + step / 2 }));
}

// Arestas item→conceito→tópico→assunto, sem duplicatas.
function buildEdges(connections: ConceptConnection[]): MiniEdge[] {
  const seen = new Set<string>();
  const edges: MiniEdge[] = [];
  const add = (from: string, to: string): void => {
    const key = `${from}->${to}`;
    if (!seen.has(key)) { seen.add(key); edges.push({ from, to }); }
  };
  for (const c of connections) {
    add("root", nodeId(1, c.conceito));
    add(nodeId(1, c.conceito), nodeId(2, c.topico));
    add(nodeId(2, c.topico), nodeId(3, c.assunto));
  }
  return edges;
}

// Monta o modelo posicionado a partir do item raiz e suas conexões de conceito.
export function buildMiniGraph(rootLabel: string, connections: ConceptConnection[]): MiniGraphModel {
  const layers = [
    [rootLabel],
    unique(connections.map((c) => c.conceito)),
    unique(connections.map((c) => c.topico)),
    unique(connections.map((c) => c.assunto)),
  ];
  const rows = Math.max(1, ...layers.map((l) => l.length));
  const height = rows * ROW_H;
  const nodes = layers.flatMap((labels, layer) => placeLayer(labels, layer, height));
  return { nodes, edges: buildEdges(connections), width: layers.length * COL_W, height };
}
