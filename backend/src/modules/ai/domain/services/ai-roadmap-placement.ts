import type { PathStep } from './learning-path';

// Inserts new steps into an existing ordered roadmap, each right after its anchor
// node (as chosen by the model). Unknown or null anchors append at the end. Pure —
// the LLM only supplies the anchor map; ordering stays deterministic here.

/** @example applyPlacements(existing, newSteps, new Map([['x','a']])) */
export function applyPlacements(
  existing: PathStep[],
  newSteps: PathStep[],
  afterByNode: Map<string, string | null>,
): PathStep[] {
  const result = [...existing];
  for (const step of newSteps) {
    const anchor = afterByNode.get(step.nodeId) ?? null;
    const idx = anchor ? result.findIndex((s) => s.nodeId === anchor) : -1;
    if (idx === -1) result.push(step);
    else result.splice(idx + 1, 0, step);
  }
  return result;
}
