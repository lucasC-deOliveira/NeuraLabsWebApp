// Groups a node's relations by the CONNECTED node's type and then by relation
// type, so the properties panel can show them separated instead of one flat list.
// Pure and deterministic.
import type { PropertiesEdge } from "./properties-panel.types";

export interface RelationSubgroup {
  relacao: string;
  edges: PropertiesEdge[];
}

export interface RelationGroup {
  tipo: string; // the connected node's type ("" when unknown)
  relacoes: RelationSubgroup[];
}

// Display order of node types; anything unlisted (incl. "") sorts last, by name.
const TYPE_ORDER = [
  "ASSUNTO", "TOPICO", "CONCEITO", "NOTA", "FLASHCARD",
  "BARALHO", "TEXTO_BRUTO", "QUESTION", "PROVA", "EDITAL", "GRAFO_REF",
];

const typeRank = (tipo: string): number => {
  const i = TYPE_ORDER.indexOf(tipo);
  return i === -1 ? TYPE_ORDER.length : i;
};

/** The type of the node on the other end of the edge (relative to nodeId). */
export function connectedType(edge: PropertiesEdge, nodeId: string): string {
  const other = edge.source === nodeId ? edge.targetType : edge.sourceType;
  return other ?? "";
}

function push(map: Map<string, PropertiesEdge[]>, key: string, edge: PropertiesEdge): void {
  map.set(key, [...(map.get(key) ?? []), edge]);
}

function subgroupByRelacao(edges: PropertiesEdge[]): RelationSubgroup[] {
  const byRel = new Map<string, PropertiesEdge[]>();
  for (const edge of edges) push(byRel, edge.tipoRelacao, edge);
  return [...byRel.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((relacao) => ({ relacao, edges: byRel.get(relacao)! }));
}

export function groupRelations(edges: PropertiesEdge[], nodeId: string): RelationGroup[] {
  const byType = new Map<string, PropertiesEdge[]>();
  for (const edge of edges) push(byType, connectedType(edge, nodeId), edge);
  return [...byType.keys()]
    .sort((a, b) => typeRank(a) - typeRank(b) || a.localeCompare(b))
    .map((tipo) => ({ tipo, relacoes: subgroupByRelacao(byType.get(tipo)!) }));
}
