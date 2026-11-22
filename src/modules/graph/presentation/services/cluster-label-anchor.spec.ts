import { expect, it } from "vitest";
import { topClusterArcPoint } from "./cluster-label-anchor";

it("places the label on the curve between its endpoints", () => {
  expect(topClusterArcPoint({ x: 0, y: 10 }, { x: 5, y: 0 }, { x: 10, y: 10 }))
    .toEqual({ x: 5, y: 5 });
});

it("uses the upper endpoint when the curve has no interior minimum", () => {
  const start = { x: 0, y: 2 };
  expect(topClusterArcPoint(start, { x: 5, y: 7 }, { x: 10, y: 10 })).toBe(start);
});
