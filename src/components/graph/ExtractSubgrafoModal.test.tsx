import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExtractSubgrafoModal } from "./ExtractSubgrafoModal";
import { extractNodesToSubgrafo } from "@/lib/graph-api";

vi.mock("@/lib/graph-api", () => ({
  extractNodesToSubgrafo: vi.fn(() =>
    Promise.resolve({ grafoId: "g1", grafoRefNodeId: "ref1", movedCount: 1, rewiredEdgeCount: 0 }),
  ),
  GRAFO_REF_RELATIONS: [{ value: "APROFUNDA", label: "Aprofunda" }],
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

const selectedNodes = [{ id: "a", label: "Conceito A", type: "CONCEITO" }];

describe("ExtractSubgrafoModal", () => {
  it("previews the selected nodes and extracts them into a new subgraph", async () => {
    const onExtracted = vi.fn();
    const onClose = vi.fn();
    render(
      <ExtractSubgrafoModal
        open
        onClose={onClose}
        parentGrafoId="parent"
        selectedNodes={selectedNodes}
        onExtracted={onExtracted}
      />,
    );

    expect(screen.getByText(/Conceito A/)).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("Ex: Fundamentos de Cálculo"), "Cálculo");
    await userEvent.click(screen.getByRole("button", { name: /Extrair/ }));

    await waitFor(() => expect(extractNodesToSubgrafo).toHaveBeenCalled());
    expect(extractNodesToSubgrafo).toHaveBeenCalledWith("parent", {
      nodeIds: ["a"],
      nome: "Cálculo",
      tipoRelacao: "APROFUNDA",
    });
    expect(onExtracted).toHaveBeenCalledWith("g1", "ref1");
    expect(onClose).toHaveBeenCalled();
  });
});
