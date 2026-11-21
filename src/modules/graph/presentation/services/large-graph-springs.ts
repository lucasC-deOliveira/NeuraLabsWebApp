/** Counts valid springs at each node, e.g. countIncidentSprings(edges, index). */
export function countIncidentSprings(
  edges: readonly { source: string; target: string }[],
  index: ReadonlyMap<string, number>,
): Uint32Array {
  const counts = new Uint32Array(index.size);
  for (const { source, target } of edges) {
    const from = index.get(source);
    const to = index.get(target);
    if (from === undefined || to === undefined || from === to) continue;
    counts[from] += 1;
    counts[to] += 1;
  }
  return counts;
}
