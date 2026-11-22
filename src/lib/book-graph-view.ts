import type { BookGraphIndex } from "@contracts/book-graph-source";

export interface BookGraphViewFilter {
  nodes: Set<string>;
  edges: Set<string>;
}

/** Encodes a directed relation without ambiguity between its three identifiers.
 * @example bookEdgeKey("a", "REFORCA", "b")
 */
export function bookEdgeKey(from: string, type: string, to: string): string {
  return JSON.stringify([from, type, to]);
}

/** Parses a user-selected set of pages or ranges.
 * @example bookPageNumbers("2, 4–6", 10)
 */
export function bookPageNumbers(selection: string, count: number): number[] | null {
  const pages = new Set<number>();
  for (const token of selection.trim().split(/\s*,\s*/u)) {
    const match = /^(\d+)(?:\s*[-–]\s*(\d+))?$/u.exec(token);
    if (!match) return null;
    const first = Number(match[1]);
    const last = Number(match[2] ?? first);
    if (first < 1 || last < first || last > count) return null;
    for (let page = first; page <= last; page++) pages.add(page);
  }
  return [...pages].sort((left, right) => left - right);
}

/** Builds the graph view for analyzed pages, including endpoints of cited relations.
 * @example filterBookGraphPages(index, [2, 5])
 */
export function filterBookGraphPages(index: BookGraphIndex, pages: readonly number[]): BookGraphViewFilter {
  const requested = new Set(pages);
  const matches = (sources: number[]): boolean => sources.some((page) => requested.has(page));
  const nodes = new Set(Object.entries(index.nodes).filter(([, sources]) => matches(sources)).map(([id]) => id));
  const edges = new Set(Object.entries(index.edges).filter(([, sources]) => matches(sources)).map(([id]) => id));
  for (const edge of edges) {
    const endpoints = /^\["([^"]+)","[^"]+","([^"]+)"\]$/u.exec(edge);
    if (endpoints) { nodes.add(endpoints[1]); nodes.add(endpoints[2]); }
  }
  return { nodes, edges };
}
