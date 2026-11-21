import { useEffect, useState } from "react";
import type { ConceptEditGraph, LoadConceptEditImpact } from "../../application/ports/graph-nodes.port";

type ImpactResult = { graphs: ConceptEditGraph[] } | { failed: true };
export type ConceptEditImpact = ImpactResult | "loading" | null;

/** Resolves the scope of a concept edit before enabling save.
 * @example const impact = useConceptEditImpact(open ? loadImpact : undefined)
 */
export function useConceptEditImpact(load: LoadConceptEditImpact | undefined): ConceptEditImpact {
  const [result, setResult] = useState<{ load: LoadConceptEditImpact; impact: ImpactResult } | null>(null);
  useEffect(() => {
    if (!load) return;
    let active = true;
    const resolve = (impact: ImpactResult): void => { if (active) setResult({ load, impact }); };
    void load().then((graphs) => resolve({ graphs })).catch(() => resolve({ failed: true }));
    return (): void => { active = false; };
  }, [load]);
  if (!load) return null;
  return result?.load === load ? result.impact : "loading";
}
