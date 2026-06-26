// Plans how to rewire the edges of a node being merged into a "keep" node:
// edges between the two are dropped, edges whose rewired signature already exists
// on keep are dropped, the rest are moved (by their changed endpoint). Pure logic.

export interface MergeEdge {
  id: string;
  nodeOrigemId: string | null;
  nodeDestinoId: string | null;
  tipoRelacao: string;
}

export interface KeepEdge {
  nodeOrigemId: string | null;
  nodeDestinoId: string | null;
  tipoRelacao: string;
}

export interface EdgeMergePlan {
  moveSrc: string[];
  moveTgt: string[];
  deleteIds: string[];
}

const sig = (origem: string | null, destino: string | null, relacao: string): string =>
  `${origem}:${destino}:${relacao}`;

export function planEdgeMerge(
  delEdges: MergeEdge[],
  keepEdges: KeepEdge[],
  delNcId: string,
  keepNcId: string,
): EdgeMergePlan {
  const keepKeys = new Set(
    keepEdges.map((e) => sig(e.nodeOrigemId, e.nodeDestinoId, e.tipoRelacao)),
  );
  const plan: EdgeMergePlan = { moveSrc: [], moveTgt: [], deleteIds: [] };
  for (const edge of delEdges) classify(edge, plan, keepKeys, delNcId, keepNcId);
  return plan;
}

function classify(
  edge: MergeEdge,
  plan: EdgeMergePlan,
  keepKeys: Set<string>,
  delNcId: string,
  keepNcId: string,
): void {
  if (isBetween(edge, delNcId, keepNcId)) return void plan.deleteIds.push(edge.id);
  const origem = edge.nodeOrigemId === delNcId ? keepNcId : edge.nodeOrigemId;
  const destino = edge.nodeDestinoId === delNcId ? keepNcId : edge.nodeDestinoId;
  const key = sig(origem, destino, edge.tipoRelacao);
  if (keepKeys.has(key)) return void plan.deleteIds.push(edge.id);
  keepKeys.add(key);
  if (edge.nodeOrigemId === delNcId) plan.moveSrc.push(edge.id);
  else plan.moveTgt.push(edge.id);
}

function isBetween(edge: MergeEdge, a: string, b: string): boolean {
  return (
    (edge.nodeOrigemId === a && edge.nodeDestinoId === b) ||
    (edge.nodeOrigemId === b && edge.nodeDestinoId === a)
  );
}
