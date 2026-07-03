import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EdgeManagerModal } from "./EdgeManagerModal";
import { getGraphNodes, deleteEdge } from "@/lib/graph-api";

// Characterization test (safety net for the hexagonal decomposition of this modal
// into use-cases + hook + presentational component). The HTTP edge is mocked; the
// port/adapter still delegates to it, so these assertions prove behavior parity.
// The add/edit form flows go through Radix Selects (hard in jsdom) and are covered
// at the use-case level (manage-graph-edges.spec.ts) instead.
vi.mock("@/lib/graph-api", () => ({
  getGraphNodes: vi.fn(() =>
    Promise.resolve({
      nodes: [
        { id: "n1", label: "Mitose", type: "CONCEITO" },
        { id: "n2", label: "Meiose", type: "CONCEITO" },
      ],
      edges: [],
    }),
  ),
  createEdge: vi.fn(),
  updateEdge: vi.fn(),
  deleteEdge: vi.fn(() => Promise.resolve({ success: true })),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

beforeEach(() => vi.clearAllMocks());

const existingEdges = [
  { id: "e1", source: "n1", target: "n2", tipoRelacao: "RELACIONADO", peso: 1, sourceLabel: "Mitose", targetLabel: "Meiose" },
];

describe("EdgeManagerModal", () => {
  it("loads the graph nodes and lists the existing edges", async () => {
    render(
      <EdgeManagerModal open onOpenChange={vi.fn()} grafoId="g1" existingEdges={existingEdges} onSuccess={vi.fn()} />,
    );
    await waitFor(() => expect(getGraphNodes).toHaveBeenCalledWith("g1"));
    expect((await screen.findAllByText("Mitose")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Meiose").length).toBeGreaterThan(0);
  });

  it("deletes an edge (confirmed) via deleteEdge and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <EdgeManagerModal open onOpenChange={vi.fn()} grafoId="g1" existingEdges={existingEdges} onSuccess={onSuccess} />,
    );
    await waitFor(() => expect(getGraphNodes).toHaveBeenCalledWith("g1"));

    await userEvent.click(screen.getByRole("button", { name: "Remover relação" }));

    await waitFor(() => expect(deleteEdge).toHaveBeenCalledWith("e1", "g1"));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("does not delete when the confirmation is dismissed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <EdgeManagerModal open onOpenChange={vi.fn()} grafoId="g1" existingEdges={existingEdges} onSuccess={vi.fn()} />,
    );
    await waitFor(() => expect(getGraphNodes).toHaveBeenCalledWith("g1"));

    await userEvent.click(screen.getByRole("button", { name: "Remover relação" }));

    expect(deleteEdge).not.toHaveBeenCalled();
  });
});
