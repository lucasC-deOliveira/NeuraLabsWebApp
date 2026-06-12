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

export function statusOf(dominio: number): RoadmapStatus {
  if (dominio >= MASTERED_THRESHOLD) return "mastered";
  if (dominio >= PARTIAL_THRESHOLD) return "partial";
  return "todo";
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

// ordena ids respeitando os pré-requisitos (topológico, Kahn) e, entre os
// disponíveis, escolhe o de maior urgência primeiro
function orderByPrereq(
  ids: string[],
  edges: REdge[],
  urgencyOf: (id: string) => number,
): string[] {
  const idset = new Set(ids);
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>(ids.map((i) => [i, 0]));

  for (const e of edges) {
    const c = prereqConstraint(e.type, e.source, e.target);
    if (!c) continue;
    const [a, b] = c;
    if (a === b || !idset.has(a) || !idset.has(b)) continue;
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
    indeg.set(b, (indeg.get(b) ?? 0) + 1);
  }

  const used = new Set<string>();
  const result: string[] = [];
  const available = ids.filter((i) => (indeg.get(i) ?? 0) === 0);

  while (available.length > 0) {
    available.sort((x, y) => urgencyOf(y) - urgencyOf(x));
    const cur = available.shift()!;
    if (used.has(cur)) continue;
    used.add(cur);
    result.push(cur);
    for (const nb of adj.get(cur) ?? []) {
      indeg.set(nb, (indeg.get(nb) ?? 0) - 1);
      if ((indeg.get(nb) ?? 0) === 0 && !used.has(nb)) available.push(nb);
    }
  }
  // sobras (ciclos): acrescenta por urgência
  for (const i of ids.slice().sort((x, y) => urgencyOf(y) - urgencyOf(x))) {
    if (!used.has(i)) result.push(i);
  }
  return result;
}

export function buildRoadmap(nodes: RNode[], edges: REdge[]): RoadmapData {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // arestas incidentes por nó (para hierarquia e importância)
  const incident = new Map<string, REdge[]>();
  const importance = new Map<string, number>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    const peso = typeof e.peso === "number" && e.peso > 0 ? e.peso : 1;
    (incident.get(e.source) ?? incident.set(e.source, []).get(e.source)!).push(e);
    (incident.get(e.target) ?? incident.set(e.target, []).get(e.target)!).push(e);
    importance.set(e.source, (importance.get(e.source) ?? 1) + peso);
    importance.set(e.target, (importance.get(e.target) ?? 1) + peso);
  }

  const dominioOf = (id: string) => byId.get(id)?.dominio ?? 0;
  const urgencyOf = (id: string) => (1 - dominioOf(id)) * (importance.get(id) ?? 1);

  const item = (id: string): RoadmapItem => {
    const n = byId.get(id)!;
    const dominio = n.dominio ?? 0;
    return { id, label: n.label ?? id, type: n.group ?? "", dominio, status: statusOf(dominio) };
  };

  // acha o "pai" de um nó preferindo PERTENCE_A; senão qualquer vizinho do tipo
  const findParent = (id: string, parentType: string): string | null => {
    let fallback: string | null = null;
    for (const e of incident.get(id) ?? []) {
      const other = e.source === id ? e.target : e.source;
      if (byId.get(other)?.group !== parentType) continue;
      if (e.type === "PERTENCE_A") return other;
      if (!fallback) fallback = other;
    }
    return fallback;
  };

  const topics = nodes.filter((n) => n.group === "TOPICO").map((n) => n.id);
  const concepts = nodes.filter((n) => n.group === "CONCEITO").map((n) => n.id);

  const topicSubject = new Map<string, string>(); // topicId → subjectId
  for (const t of topics) {
    const s = findParent(t, "ASSUNTO");
    if (s) topicSubject.set(t, s);
  }
  const conceptTopic = new Map<string, string>(); // conceptId → topicId
  for (const c of concepts) {
    const t = findParent(c, "TOPICO");
    if (t) conceptTopic.set(c, t);
  }

  // conceitos por tópico
  const conceptsByTopic = new Map<string, string[]>();
  const looseByGeral: string[] = [];
  for (const c of concepts) {
    const t = conceptTopic.get(c);
    if (t) (conceptsByTopic.get(t) ?? conceptsByTopic.set(t, []).get(t)!).push(c);
    else looseByGeral.push(c);
  }

  // tópicos por seção (assunto), com seção "Geral" para os sem assunto
  const topicsBySection = new Map<string, string[]>();
  for (const t of topics) {
    const sid = topicSubject.get(t) ?? GERAL_ID;
    (topicsBySection.get(sid) ?? topicsBySection.set(sid, []).get(sid)!).push(t);
  }

  const sectionIds = new Set<string>([...topicsBySection.keys()]);
  if (looseByGeral.length > 0) sectionIds.add(GERAL_ID);

  const sections: RoadmapSection[] = [];
  for (const sid of sectionIds) {
    const topicIds = orderByPrereq(topicsBySection.get(sid) ?? [], edges, urgencyOf);
    const roadmapTopics: RoadmapTopic[] = topicIds.map((t) => ({
      ...item(t),
      concepts: orderByPrereq(conceptsByTopic.get(t) ?? [], edges, urgencyOf).map(item),
    }));
    const looseConcepts =
      sid === GERAL_ID ? orderByPrereq(looseByGeral, edges, urgencyOf).map(item) : [];

    if (roadmapTopics.length === 0 && looseConcepts.length === 0) continue;

    sections.push({
      id: sid,
      label: sid === GERAL_ID ? "Geral" : byId.get(sid)?.label ?? "Assunto",
      topics: roadmapTopics,
      looseConcepts,
    });
  }

  // ordena seções pela urgência agregada (mais a estudar primeiro); Geral por último
  const sectionUrgency = (s: RoadmapSection) => {
    let u = 0;
    for (const t of s.topics) {
      u += urgencyOf(t.id);
      for (const c of t.concepts) u += urgencyOf(c.id);
    }
    for (const c of s.looseConcepts) u += urgencyOf(c.id);
    return u;
  };
  sections.sort((a, b) => {
    if (a.id === GERAL_ID) return 1;
    if (b.id === GERAL_ID) return -1;
    return sectionUrgency(b) - sectionUrgency(a);
  });

  // contagem geral de progresso
  let total = 0;
  let mastered = 0;
  for (const s of sections) {
    const all = [...s.topics, ...s.topics.flatMap((t) => t.concepts), ...s.looseConcepts];
    for (const it of all) {
      total++;
      if (it.status === "mastered") mastered++;
    }
  }

  return { sections, total, mastered };
}
