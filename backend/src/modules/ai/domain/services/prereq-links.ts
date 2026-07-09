import type { LearningEdge } from '../ports/learning-graph-repository';
import type { PrereqLink } from './prioritize-learning-path';

// Prereq relation directions: origem "depends on" destino → destino first; origem
// "is prerequisite/foundation of" destino → origem first.
const DEPENDS_ON = new Set(['DEPENDE_DE']);
const IS_PREREQ_OF = new Set(['PREREQUISITO', 'FUNDAMENTA']);

/**
 * Extracts prerequisite ordering constraints (before → after) from graph edges,
 * used to keep any re-ranking prerequisite-respecting. Pure.
 * @example prereqLinks([{ origem: 'a', destino: 'b', relacao: 'DEPENDE_DE' }])
 */
export function prereqLinks(edges: LearningEdge[]): PrereqLink[] {
  const links: PrereqLink[] = [];
  for (const e of edges) {
    if (DEPENDS_ON.has(e.relacao)) links.push({ before: e.destino, after: e.origem });
    else if (IS_PREREQ_OF.has(e.relacao)) links.push({ before: e.origem, after: e.destino });
  }
  return links;
}
