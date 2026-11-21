import { describe, expect, it } from "vitest";
import type { SimNode } from "../../infra/layout/force-layout.engine";
import { seedLargeLayout } from "./large-layout-seed";

const original: SimNode = {
  id: "concept", label: "Concept", group: "CONCEITO", tipoReal: "CONCEITO",
  dominio: 0, prioridadeRevisao: 5, width: 104, height: 46,
  x: 900, y: -900, vx: 4, vy: -4, fixed: true, pinned: true,
};

describe("large graph layout seed", () => {
  it("opens from fresh positions without changing the original nodes", () => {
    const [seed] = seedLargeLayout([original], () => 0.5);
    expect(seed).toMatchObject({ id: original.id, pinned: false, fixed: false, vx: 0, vy: 0 });
    expect(Math.hypot(seed.x, seed.y)).toBeCloseTo(76 * Math.sqrt(0.5));
    expect(original).toMatchObject({ x: 900, y: -900, pinned: true, fixed: true });
  });
});
