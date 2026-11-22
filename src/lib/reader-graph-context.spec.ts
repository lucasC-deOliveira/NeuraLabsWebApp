import { expect, it } from "vitest";
import { getReaderGraph, rememberReaderGraph } from "./reader-graph-context";

it("keeps only concepts belonging to the latest loaded graph", () => {
  rememberReaderGraph("old", "Previous graph", [{ id: "old", label: "Old", type: "CONCEITO" }]);
  rememberReaderGraph("new", "Current graph", [
    { id: "1", label: "Local", type: "CONCEITO" },
    { id: "2", label: "Other node type", type: "TOPICO" },
    { id: "3", label: "Expanded concept", type: "CONCEITO", expandedFrom: "nested" },
  ]);
  expect(getReaderGraph()).toEqual({ id: "new", name: "Current graph", concepts: [{ id: "1", label: "Local" }] });
});
