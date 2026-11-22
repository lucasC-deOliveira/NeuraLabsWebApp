import { expect, it } from "vitest";
import { bookEdgeKey, filterBookGraphPages } from "./book-graph-view";

it("includes only page evidence and the endpoints of relations cited on the selected page", () => {
  const selected = bookEdgeKey("new", "REFORCA", "prior");
  const other = bookEdgeKey("new", "CONTRASTA_COM", "prior");
  const result = filterBookGraphPages({
    coverage: [3, 7], imported: [], nodes: { new: [7], prior: [3], unrelated: [3] },
    edges: { [selected]: [7], [other]: [3] },
  }, [7]);
  expect(result.nodes).toEqual(new Set(["new", "prior"]));
  expect(result.edges).toEqual(new Set([selected]));
});
