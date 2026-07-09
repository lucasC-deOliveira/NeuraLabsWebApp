import type { PathStep } from './learning-path';

// Incremental merge of a persisted roadmap with a freshly-computed full order.
// Existing items keep their persisted relative order (stability); items no longer
// present are dropped; new items are slotted at their priority position (dictated by
// `fullOrder`). Step data always comes from `fullOrder` so scores/reasons stay fresh.
// Pure.

export interface TrilhaMerge {
  itens: PathStep[];
  novos: number; // how many new items were inserted
}

/** @example mergeTrilha(['b','a'], order('a','b','c')) */
export function mergeTrilha(persistedIds: string[], fullOrder: PathStep[]): TrilhaMerge {
  const rank = new Map(fullOrder.map((s, i) => [s.nodeId, i]));
  const byId = new Map(fullOrder.map((s) => [s.nodeId, s]));
  const kept = persistedIds.filter((id) => byId.has(id));
  const keptSet = new Set(kept);
  const itens = kept.map((id) => byId.get(id)!);
  const news = fullOrder.filter((s) => !keptSet.has(s.nodeId));
  for (const item of news) insertByRank(itens, item, rank);
  return { itens, novos: news.length };
}

// Inserts `item` before the first current item that ranks lower (higher index) in the
// full order; appends when none does.
function insertByRank(itens: PathStep[], item: PathStep, rank: Map<string, number>): void {
  const r = rank.get(item.nodeId) ?? Number.POSITIVE_INFINITY;
  const idx = itens.findIndex((s) => (rank.get(s.nodeId) ?? Number.POSITIVE_INFINITY) > r);
  if (idx === -1) itens.push(item);
  else itens.splice(idx, 0, item);
}
