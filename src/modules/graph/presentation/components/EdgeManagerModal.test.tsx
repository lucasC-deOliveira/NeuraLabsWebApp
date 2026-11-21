import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EdgeManagerModal } from "./EdgeManagerModal";
import { getGraphNodes, deleteEdge, updateEdge } from "@/lib/graph-api";
import type { LoadRelationImpact } from "../../application/ports/relation-impact.port";
import type { GraphEdgesPort } from "../../application/ports/graph-edges.port";

class FakeGraphEdgeEditor implements GraphEdgesPort {
  deleted: string[] = [];

  async createEdge(): Promise<{ success: boolean; edgeId: string }> {
    return { success: true, edgeId: "e1" };
  }

  async updateEdge(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async deleteEdge(id: string): Promise<{ success: boolean }> {
    this.deleted.push(id);
    return { success: true };
  }
}

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
const sharedImpact: LoadRelationImpact = async () => [
  { id: "g1", name: "Biologia" }, { id: "g2", name: "Revisão" },
];

describe("EdgeManagerModal", () => {
  it("requires confirmation of the named graph views before editing a shared relation", async () => {
    vi.mocked(updateEdge).mockResolvedValueOnce({ success: true });
    render(
      <EdgeManagerModal open onOpenChange={vi.fn()} grafoId="g1" existingEdges={existingEdges}
        initialEditEdge={existingEdges[0]} loadImpact={sharedImpact} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Biologia")).toBeVisible();
    expect(screen.getByText("Revisão")).toBeVisible();
    expect(updateEdge).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Salvar alteração" }));
    await waitFor(() => expect(updateEdge).toHaveBeenCalled());
  });
  it("uses the local editor and node list without calling the API", async () => {
    const edgePort = new FakeGraphEdgeEditor();
    render(
      <EdgeManagerModal
        open onOpenChange={vi.fn()} grafoId="g1" existingEdges={existingEdges}
        localNodes={[{ id: "n1", label: "Vault label", type: "CONCEITO" }]} edgePort={edgePort} loadImpact={sharedImpact}
      />,
    );
    expect(screen.getByText("Vault label")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Remover relação" }));
    expect(edgePort.deleted).toEqual([]);
    expect(await screen.findByText("Biologia")).toBeVisible();
    expect(screen.getByText("Revisão")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(edgePort.deleted).toEqual(["e1"]);
    expect(deleteEdge).not.toHaveBeenCalled();
    expect(getGraphNodes).not.toHaveBeenCalled();
  });

  it("lists vault relationships without requesting nodes or offering edits", async () => {
    render(<EdgeManagerModal open onOpenChange={vi.fn()} grafoId="g1" existingEdges={existingEdges} readOnly />);
    expect(await screen.findByText("Mitose")).toBeVisible();
    expect(screen.getByText("Meiose")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Nova relação" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remover relação" })).not.toBeInTheDocument();
    expect(getGraphNodes).not.toHaveBeenCalled();
  });

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
    render(
      <EdgeManagerModal open onOpenChange={vi.fn()} grafoId="g1" existingEdges={existingEdges} onSuccess={onSuccess} />,
    );
    await waitFor(() => expect(getGraphNodes).toHaveBeenCalledWith("g1"));

    await userEvent.click(screen.getByRole("button", { name: "Remover relação" }));
    expect(deleteEdge).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(deleteEdge).toHaveBeenCalledWith("e1", "g1"));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("does not delete when the confirmation is dismissed", async () => {
    render(
      <EdgeManagerModal open onOpenChange={vi.fn()} grafoId="g1" existingEdges={existingEdges} onSuccess={vi.fn()} />,
    );
    await waitFor(() => expect(getGraphNodes).toHaveBeenCalledWith("g1"));

    await userEvent.click(screen.getByRole("button", { name: "Remover relação" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(deleteEdge).not.toHaveBeenCalled();
  });
});
