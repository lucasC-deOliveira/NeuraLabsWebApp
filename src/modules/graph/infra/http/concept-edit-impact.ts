import { listConceptEditGraphs } from "@/lib/graph-api";
import type { LoadConceptEditImpact } from "../../application/ports/graph-nodes.port";

/** Looks up the server views of a concept without loading their graphs.
 * @example const loadImpact = serverConceptEditImpact(conceptId)
 */
export function serverConceptEditImpact(conceptId: string): LoadConceptEditImpact {
  return () => listConceptEditGraphs(conceptId);
}
