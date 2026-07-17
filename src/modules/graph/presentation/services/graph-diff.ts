// Authoritative "what did this write create?" for undo: snapshot the graph's node
// and edge ids before an operation, snapshot again after, and the ids that appeared
// are exactly what an undo must remove. Reused nodes keep their old id, so they
// never show up here — only genuinely new entities do.

export interface GraphIdSnapshot {
  nodeIds: string[];
  edgeIds: string[];
}

export interface CreatedIds {
  nodeIds: string[];
  edgeIds: string[];
}

/** Ids present in `after` but absent from `before` — the freshly created ones. */
export function newIds(before: string[], after: string[]): string[] {
  const had = new Set(before);
  return after.filter((id) => !had.has(id));
}

/** What a write created, comparing the before/after id snapshots. */
export function createdBetween(before: GraphIdSnapshot, after: GraphIdSnapshot): CreatedIds {
  return {
    nodeIds: newIds(before.nodeIds, after.nodeIds),
    edgeIds: newIds(before.edgeIds, after.edgeIds),
  };
}
