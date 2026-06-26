import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Graph3DRenderer } from "./Graph3DRenderer";

// react-force-graph-3d monta WebGL (three) — fora do alcance do jsdom; mockamos
// por um placeholder. As callbacks 3D (nodeThreeObject etc.) não são exercitadas.
vi.mock("react-force-graph-3d", async () => {
  const React = await import("react");
  return { default: () => React.createElement("div", { "data-testid": "force-graph-3d" }) };
});

const props = {
  nodes: [],
  edges: [],
  isDark: false,
  matchedIds: null,
  selectedNodeIds: new Set<string>(),
  onNodeClick: vi.fn(),
};

describe("Graph3DRenderer (smoke)", () => {
  it("mounts the 3D force graph without crashing", () => {
    render(<Graph3DRenderer {...props} />);
    expect(screen.getByTestId("force-graph-3d")).toBeInTheDocument();
  });
});
