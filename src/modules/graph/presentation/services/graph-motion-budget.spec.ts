import { describe, expect, it } from "vitest";
import { createGraphMotionBudget } from "./graph-motion-budget";
import { relaxGraphMotion } from "./relax-graph-motion";
import { countIncidentSprings } from "./large-graph-springs";

describe("large graph motion", () => {
  it("softens late steps and restores full movement on interaction", () => {
    const pass = createGraphMotionBudget(10);
    const gains = Array.from({ length: 10 }, () => pass.nextGain());
    expect(gains[0]).toBe(1);
    expect(gains[9]).toBeLessThan(0.01);
    expect(pass.nextGain()).toBeUndefined();
    pass.reheat();
    expect(pass.nextGain()).toBe(1);
  });

  it("dampens displacement and residual velocity", () => {
    const before = [{ id: "node", x: 10, y: 0, vx: 0, vy: 0 }];
    const after = [{ id: "node", x: 30, y: 0, vx: 8, vy: 0 }];
    expect(relaxGraphMotion(before, after, 0.25)).toEqual([{ id: "node", x: 15, y: 0, vx: 2, vy: 0 }]);
  });

  it("counts incident springs on both endpoints and skips self-links and missing nodes", () => {
    const index = new Map([["hub", 0], ["a", 1], ["b", 2]]);
    const endpoints = [["hub", "a"], ["b", "hub"], ["hub", "hub"], ["hub", "hidden"]];
    const edges = endpoints.map(([source, target]) => ({ source, target }));
    expect([...countIncidentSprings(edges, index)]).toEqual([2, 1, 1]);
  });
});
