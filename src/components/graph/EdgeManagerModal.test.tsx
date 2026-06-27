import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { EdgeManagerModal } from "./EdgeManagerModal";
import { getGraphNodes } from "@/lib/graph-api";

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
  deleteEdge: vi.fn(),
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
});
