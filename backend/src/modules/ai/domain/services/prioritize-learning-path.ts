import type { PathStep } from './learning-path';

// Re-ranks a learning path so higher-importance concepts come first WITHOUT
// violating prerequisites: a greedy topological order that, among the steps whose
// prerequisites are already placed, always picks the most important one (ties keep
// the original order). Prereq-free graphs collapse to pure importance order; a
// cycle degrades gracefully (leftovers appended in original order). Pure.

export interface PrereqLink {
  before: string; // node that must come first
  after: string; // node that depends on it
}

/** @example prioritizeLearningPath(steps, links, importanceByNodeId) */
export function prioritizeLearningPath(
  steps: PathStep[],
  prereqs: PrereqLink[],
  importance: Map<string, number>,
): PathStep[] {
  const ids = new Set(steps.map((s) => s.nodeId));
  const pending = pendingPrereqs(prereqs, ids);
  const placed = new Set<string>();
  const ordered: PathStep[] = [];
  const remaining = [...steps];
  while (remaining.length > 0) {
    const idx = pickNext(remaining, pending, placed, importance);
    const [step] = remaining.splice(idx, 1);
    ordered.push(step);
    placed.add(step.nodeId);
  }
  return ordered;
}

// nodeId → set of prerequisite nodeIds still to be placed (only edges within the path).
function pendingPrereqs(prereqs: PrereqLink[], ids: Set<string>): Map<string, Set<string>> {
  const pending = new Map<string, Set<string>>();
  for (const { before, after } of prereqs) {
    if (!ids.has(before) || !ids.has(after) || before === after) continue;
    const deps = pending.get(after) ?? new Set<string>();
    deps.add(before);
    pending.set(after, deps);
  }
  return pending;
}

// Index of the highest-importance step whose prerequisites are all placed; falls
// back to the plain highest-importance step if a cycle blocks everyone.
function pickNext(
  remaining: PathStep[],
  pending: Map<string, Set<string>>,
  placed: Set<string>,
  importance: Map<string, number>,
): number {
  let best = -1;
  let bestUnlocked = -1;
  remaining.forEach((step, i) => {
    if (isBetter(step, remaining[best], importance)) best = i;
    if (unlocked(step, pending, placed) && isBetter(step, remaining[bestUnlocked], importance)) {
      bestUnlocked = i;
    }
  });
  return bestUnlocked >= 0 ? bestUnlocked : best;
}

function unlocked(step: PathStep, pending: Map<string, Set<string>>, placed: Set<string>): boolean {
  const deps = pending.get(step.nodeId);
  return !deps || [...deps].every((d) => placed.has(d));
}

function isBetter(
  step: PathStep,
  current: PathStep | undefined,
  importance: Map<string, number>,
): boolean {
  if (!current) return true;
  return (importance.get(step.nodeId) ?? 0) > (importance.get(current.nodeId) ?? 0);
}
