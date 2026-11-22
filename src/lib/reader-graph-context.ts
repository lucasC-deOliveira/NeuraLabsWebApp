interface ReaderGraphNode {
  id: string;
  label: string;
  type: string;
  expandedFrom?: string;
}

export interface ReaderGraphConcept {
  id: string;
  label: string;
}

interface ReaderGraphContext {
  id: string;
  name: string;
  concepts: ReaderGraphConcept[];
}

let openReaderGraph: ReaderGraphContext | null = null;

/** Keeps titles from the last graph loaded in the current app session.
 * @example rememberReaderGraph("g1", "Biologia", graphNodes)
 */
export function rememberReaderGraph(id: string, name: string, graphNodes: readonly ReaderGraphNode[]): void {
  const concepts = graphNodes.filter((node) => node.type === "CONCEITO" && !node.expandedFrom)
    .map(({ id, label }) => ({ id, label }));
  openReaderGraph = { id, name, concepts };
}

/** Reads the current session's graph context without loading the graph again.
 * @example const graph = getReaderGraph()
 */
export function getReaderGraph(): ReaderGraphContext | null {
  return openReaderGraph;
}
