import type { SimNode } from "../../infra/layout/force-layout.engine";

/** Spreads a large graph before its force layout, e.g. seedLargeLayout(nodes). */
export function seedLargeLayout(nodes: SimNode[], random = Math.random): SimNode[] {
  const radius = 76 * Math.sqrt(nodes.length);
  return nodes.map((node) => {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * radius;
    return {
      ...node,
      x: distance * Math.cos(angle), y: distance * Math.sin(angle),
      vx: 0, vy: 0, fixed: false, pinned: false,
    };
  });
}
