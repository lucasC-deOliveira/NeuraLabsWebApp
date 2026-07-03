// Roadmap de estudo (estilo roadmap.sh) derivado do grafo.
// Estrutura: Assunto (seção) › Tópico (espinha) › Conceito (ramos).
// Ordem: pré-requisitos primeiro (fundamentos antes dos dependentes),
// desempatando pela URGÊNCIA = (1 − domínio) × importância, onde a
// importância vem da soma dos PESOS das relações incidentes ao nó.
// O estado (cor) de cada item vem da maestria/domínio.

export type RoadmapStatus = "mastered" | "partial" | "todo";

export type RoadmapItem = {
  id: string;
  label: string;
  type: string;
  dominio: number;
  status: RoadmapStatus;
};

export type RoadmapTopic = RoadmapItem & { concepts: RoadmapItem[] };

export type RoadmapSection = {
  id: string;
  label: string;
  topics: RoadmapTopic[];
  looseConcepts: RoadmapItem[];
};

export type RoadmapData = {
  sections: RoadmapSection[];
  total: number;
  mastered: number;
};

type RNode = { id: string; label?: string; group?: string; dominio?: number };
type REdge = { source: string; target: string; type?: string; peso?: number };

export const MASTERED_THRESHOLD = 0.7;
export const PARTIAL_THRESHOLD = 0.3;
const GERAL_ID = "__geral__";

type UrgencyFn = (id: string) => number;

export function statusOf(dominio: number): RoadmapStatus {
  if (dominio >= MASTERED_THRESHOLD) return "mastered";
  if (dominio >= PARTIAL_THRESHOLD) return "partial";
  return "todo";
}

function pushInto<T>(map: Map<string, T[]>, key: string, val: T): void {
  const arr = map.get(key) ?? [];
  arr.push(val);
  map.set(key, arr);
}

// Para uma relação de pré-requisito, devolve [antes, depois] — qual nó deve
// ser estudado antes do outro. Null para relações que não impõem ordem.
function prereqConstraint(type: string | undefined, source: string, target: string): [string, string] | null {
  switch (type) {
    case "PREREQUISITO": // origem é pré-requisito do destino → origem antes
      return [source, target];
    case "DEPENDE_DE": // origem depende do destino → destino antes
    case "SUBTOPICO_DE": // origem é subtópico do destino (pai) → destino antes
      return [target, source];
    default:
      return null;
  }
}

// grafo de pré-requisitos (adjacência + grau de entrada) restrito ao conjunto `ids`.
function buildPrereqGraph(ids: string[], idset: Set<string>, edges: REdge[]): { adj: Map<string, string[]>; indeg: Map<string, number> } {
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>(ids.map((i) => [i, 0]));
  for (const e of edges) {
    const c = prereqConstraint(e.type, e.source, e.target);
    if (!c) continue;
    const [a, b] = c;
    if (a === b || !idset.has(a) || !idset.has(b)) continue;
    pushInto(adj, a, b);
    indeg.set(b, (indeg.get(b) ?? 0) + 1);
  }
  return { adj, indeg };
}

// decrementa o grau de entrada dos vizinhos de `cur`; enfileira os que zeraram.
function relaxNeighbors(adj: Map<string, string[]>, indeg: Map<string, number>, used: Set<string>, available: string[], cur: string): void {
  for (const nb of adj.get(cur) ?? []) {
    indeg.set(nb, (indeg.get(nb) ?? 0) - 1);
    if ((indeg.get(nb) ?? 0) === 0 && !used.has(nb)) available.push(nb);
  }
}

// ordena ids respeitando os pré-requisitos (topológico, Kahn) e, entre os
// disponíveis, escolhe o de maior urgência primeiro.
function orderByPrereq(ids: string[], edges: REdge[], urgencyOf: UrgencyFn): string[] {
  const idset = new Set(ids);
  const { adj, indeg } = buildPrereqGraph(ids, idset, edges);
  const used = new Set<string>();
  const result: string[] = [];
  const available = ids.filter((i) => (indeg.get(i) ?? 0) === 0);
  while (available.length > 0) {
    available.sort((x, y) => urgencyOf(y) - urgencyOf(x));
    const cur = available.shift()!;
    if (used.has(cur)) continue;
    used.add(cur);
    result.push(cur);
    relaxNeighbors(adj, indeg, used, available, cur);
  }
  // sobras (ciclos): acrescenta por urgência
  for (const i of ids.slice().sort((x, y) => urgencyOf(y) - urgencyOf(x))) {
    if (!used.has(i)) result.push(i);
  }
  return result;
}

// arestas incidentes por nó (hierarquia) + importância (soma dos pesos incidentes).
function indexIncidence(byId: Map<string, RNode>, edges: REdge[]): { incident: Map<string, REdge[]>; importance: Map<string, number> } {
  const incident = new Map<string, REdge[]>();
  const importance = new Map<string, number>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    const peso = typeof e.peso === "number" && e.peso > 0 ? e.peso : 1;
    pushInto(incident, e.source, e);
    pushInto(incident, e.target, e);
    importance.set(e.source, (importance.get(e.source) ?? 1) + peso);
    importance.set(e.target, (importance.get(e.target) ?? 1) + peso);
  }
  return { incident, importance };
}

function toItem(byId: Map<string, RNode>, id: string): RoadmapItem {
  const n = byId.get(id)!;
  const dominio = n.dominio ?? 0;
  return { id, label: n.label ?? id, type: n.group ?? "", dominio, status: statusOf(dominio) };
}

// acha o "pai" de um nó preferindo PERTENCE_A; senão qualquer vizinho do tipo.
function findParent(id: string, byId: Map<string, RNode>, incident: Map<string, REdge[]>, parentType: string): string | null {
  let fallback: string | null = null;
  for (const e of incident.get(id) ?? []) {
    const other = e.source === id ? e.target : e.source;
    if (byId.get(other)?.group !== parentType) continue;
    if (e.type === "PERTENCE_A") return other;
    if (!fallback) fallback = other;
  }
  return fallback;
}

function mapParents(ids: string[], byId: Map<string, RNode>, incident: Map<string, REdge[]>, parentType: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const id of ids) {
    const p = findParent(id, byId, incident, parentType);
    if (p) result.set(id, p);
  }
  return result;
}

function groupConcepts(concepts: string[], conceptTopic: Map<string, string>): { conceptsByTopic: Map<string, string[]>; looseByGeral: string[] } {
  const conceptsByTopic = new Map<string, string[]>();
  const looseByGeral: string[] = [];
  for (const c of concepts) {
    const t = conceptTopic.get(c);
    if (t) pushInto(conceptsByTopic, t, c);
    else looseByGeral.push(c);
  }
  return { conceptsByTopic, looseByGeral };
}

function groupTopicsBySection(topics: string[], topicSubject: Map<string, string>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const t of topics) pushInto(map, topicSubject.get(t) ?? GERAL_ID, t);
  return map;
}

function collectSectionIds(topicsBySection: Map<string, string[]>, looseByGeral: string[]): Set<string> {
  const ids = new Set<string>(topicsBySection.keys());
  if (looseByGeral.length > 0) ids.add(GERAL_ID);
  return ids;
}

interface RoadmapIndex {
  byId: Map<string, RNode>;
  edges: REdge[];
  urgencyOf: UrgencyFn;
  conceptsByTopic: Map<string, string[]>;
  topicsBySection: Map<string, string[]>;
  looseByGeral: string[];
}

function sectionLabel(sid: string, byId: Map<string, RNode>): string {
  return sid === GERAL_ID ? "Geral" : byId.get(sid)?.label ?? "Assunto";
}

function buildSection(sid: string, idx: RoadmapIndex): RoadmapSection | null {
  const item = (id: string): RoadmapItem => toItem(idx.byId, id);
  const topicIds = orderByPrereq(idx.topicsBySection.get(sid) ?? [], idx.edges, idx.urgencyOf);
  const topics: RoadmapTopic[] = topicIds.map((t) => ({
    ...item(t),
    concepts: orderByPrereq(idx.conceptsByTopic.get(t) ?? [], idx.edges, idx.urgencyOf).map(item),
  }));
  const looseConcepts = sid === GERAL_ID ? orderByPrereq(idx.looseByGeral, idx.edges, idx.urgencyOf).map(item) : [];
  if (topics.length === 0 && looseConcepts.length === 0) return null;
  return { id: sid, label: sectionLabel(sid, idx.byId), topics, looseConcepts };
}

function buildSections(sectionIds: Set<string>, idx: RoadmapIndex): RoadmapSection[] {
  return [...sectionIds]
    .map((sid) => buildSection(sid, idx))
    .filter((s): s is RoadmapSection => s !== null);
}

// urgência agregada da seção (mais a estudar primeiro).
function sectionUrgency(s: RoadmapSection, urgencyOf: UrgencyFn): number {
  const ids = [...s.topics.map((t) => t.id), ...s.topics.flatMap((t) => t.concepts.map((c) => c.id)), ...s.looseConcepts.map((c) => c.id)];
  return ids.reduce((u, id) => u + urgencyOf(id), 0);
}

function sortSections(sections: RoadmapSection[], urgencyOf: UrgencyFn): RoadmapSection[] {
  return sections.slice().sort((a, b) => {
    if (a.id === GERAL_ID) return 1;
    if (b.id === GERAL_ID) return -1;
    return sectionUrgency(b, urgencyOf) - sectionUrgency(a, urgencyOf);
  });
}

function allItems(s: RoadmapSection): RoadmapItem[] {
  return [...s.topics, ...s.topics.flatMap((t) => t.concepts), ...s.looseConcepts];
}

function countProgress(sections: RoadmapSection[]): { total: number; mastered: number } {
  const all = sections.flatMap(allItems);
  return { total: all.length, mastered: all.filter((it) => it.status === "mastered").length };
}

export function buildRoadmap(nodes: RNode[], edges: REdge[]): RoadmapData {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const { incident, importance } = indexIncidence(byId, edges);
  const urgencyOf: UrgencyFn = (id) => (1 - (byId.get(id)?.dominio ?? 0)) * (importance.get(id) ?? 1);
  const topics = nodes.filter((n) => n.group === "TOPICO").map((n) => n.id);
  const concepts = nodes.filter((n) => n.group === "CONCEITO").map((n) => n.id);
  const topicSubject = mapParents(topics, byId, incident, "ASSUNTO");
  const conceptTopic = mapParents(concepts, byId, incident, "TOPICO");
  const { conceptsByTopic, looseByGeral } = groupConcepts(concepts, conceptTopic);
  const topicsBySection = groupTopicsBySection(topics, topicSubject);
  const sectionIds = collectSectionIds(topicsBySection, looseByGeral);
  const idx: RoadmapIndex = { byId, edges, urgencyOf, conceptsByTopic, topicsBySection, looseByGeral };
  const sections = sortSections(buildSections(sectionIds, idx), urgencyOf);
  return { sections, ...countProgress(sections) };
}
