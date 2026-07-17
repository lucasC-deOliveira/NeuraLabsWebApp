import { describe, it, expect } from "vitest";
import { newIds, createdBetween } from "./graph-diff";

describe("newIds", () => {
  it("returns only ids that appeared after", () => {
    expect(newIds(["a", "b"], ["a", "b", "c", "d"])).toEqual(["c", "d"]);
  });

  it("ignores reused ids and preserves after-order", () => {
    expect(newIds(["b"], ["c", "b", "a"])).toEqual(["c", "a"]);
  });

  it("returns empty when nothing new appeared", () => {
    expect(newIds(["a", "b"], ["a"])).toEqual([]);
  });
});

describe("createdBetween", () => {
  it("reports created nodes and edges together", () => {
    const before = { nodeIds: ["n1"], edgeIds: ["e1"] };
    const after = { nodeIds: ["n1", "n2", "n3"], edgeIds: ["e1", "e2"] };
    expect(createdBetween(before, after)).toEqual({ nodeIds: ["n2", "n3"], edgeIds: ["e2"] });
  });

  it("reports nothing when the write reused everything", () => {
    const snap = { nodeIds: ["n1", "n2"], edgeIds: ["e1"] };
    expect(createdBetween(snap, snap)).toEqual({ nodeIds: [], edgeIds: [] });
  });
});
