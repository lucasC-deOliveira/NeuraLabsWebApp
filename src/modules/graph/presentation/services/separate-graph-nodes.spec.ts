import { describe, expect, it } from "vitest";
import { separateGraphNodes } from "./separate-graph-nodes";

describe("separateGraphNodes", () => {
  it("places a dense collection of mixed sizes without overlap", () => {
    const initial = Array.from({ length: 54 }, (_, i) => ({
      id: String(i), x: -9, y: -20, width: 46 + (i % 8) * 8, height: 42 + (i % 6) * 7,
    }));
    const layout = separateGraphNodes(initial, 10);
    const hasOverlap = layout.some((left, i) => layout.slice(i + 1).some((right) =>
      Math.abs(left.x - right.x) < (left.width + right.width) / 2 + 10 &&
      Math.abs(left.y - right.y) < (left.height + right.height) / 2 + 10,
    ));
    expect(hasOverlap).toBe(false);
    expect(layout.map(({ id }) => id)).toEqual(initial.map(({ id }) => id));
    expect(layout[0]).toBe(initial[0]);
    expect(separateGraphNodes(layout, 10)).toBe(layout);
  });
});
