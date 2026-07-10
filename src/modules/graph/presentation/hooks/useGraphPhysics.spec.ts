import { describe, it, expect } from "vitest";
import { stepVisible } from "./useGraphPhysics";
import { DEFAULT_PHYSICS_OPTIONS } from "../services/graph-physics.service";

type N = { id: string; x: number; y: number };
const node = (id: string, x: number, y: number): N => ({ id, x, y });

describe("stepVisible", () => {
  it("keeps hidden nodes fixed and preserves order/length", () => {
    const prev = [node("a", 0, 0), node("b", 30, 0), node("hidden", 15, 0)];
    const next = stepVisible(prev, [], DEFAULT_PHYSICS_OPTIONS, new Set(["hidden"]));
    const h = next.find((n) => n.id === "hidden");
    expect(h).toEqual({ id: "hidden", x: 15, y: 0 }); // did not move
    expect(next.map((n) => n.id)).toEqual(["a", "b", "hidden"]);
  });

  it("a hidden node exerts no force — visible nodes move as if it were absent", () => {
    const opts = DEFAULT_PHYSICS_OPTIONS;
    const withHidden = stepVisible(
      [node("a", 0, 0), node("b", 40, 0), node("h", 20, 0)],
      [],
      opts,
      new Set(["h"]),
    );
    const withoutHidden = stepVisible([node("a", 0, 0), node("b", 40, 0)], [], opts, new Set());
    const a1 = withHidden.find((n) => n.id === "a");
    const a2 = withoutHidden.find((n) => n.id === "a");
    expect(a1?.x).toBeCloseTo(a2?.x ?? NaN, 9);
    expect(a1?.y).toBeCloseTo(a2?.y ?? NaN, 9);
  });

  it("returns the original array reference when the visible subset does not move", () => {
    // only one visible node → physicsStep is a no-op → same ref (loop reads as settled)
    const prev = [node("a", 0, 0), node("h", 1, 1)];
    expect(stepVisible(prev, [], DEFAULT_PHYSICS_OPTIONS, new Set(["h"]))).toBe(prev);
  });
});
