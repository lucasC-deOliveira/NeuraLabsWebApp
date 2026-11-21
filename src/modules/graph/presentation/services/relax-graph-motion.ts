import type { PhysicsNode } from "./graph-physics.service";

/** Softens settling motion, including collision corrections, e.g. relaxGraphMotion(before, after, 0.25). */
export function relaxGraphMotion<T extends PhysicsNode>(before: T[], after: T[], gain: number): T[] {
  if (before === after || gain === 1) return after;
  return after.map((node, index) => {
    const old = before[index];
    if (old === node) return old;
    return {
      ...node, x: old.x + (node.x - old.x) * gain, y: old.y + (node.y - old.y) * gain,
      vx: (node.vx ?? 0) * gain, vy: (node.vy ?? 0) * gain,
    };
  });
}
