import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditNodeModal } from "./EditNodeModal";
import { getNodeDetails, updateGraphNode } from "@/lib/graph-api";

// Characterization test (safety net for the hexagonal decomposition of this modal
// into use-case + hook + presentational component). Captures the observable
// behavior with the HTTP edge mocked — the port/adapter still delegates to it, so
// these assertions prove behavior was preserved across the move.
// The CONCEITO node path is the simplest form (nome + descrição, no Select).
vi.mock("@/lib/graph-api", () => ({
  getNodeDetails: vi.fn(),
  updateGraphNode: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const node = { id: "n1", group: "CONCEITO", label: "Mitose" };

// true quando `a` aparece antes de `b` na ordem do documento (camada estrutural:
// garante hierarquia/ordem dos elementos sem depender de layout em pixels).
function isBefore(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EditNodeModal (characterization)", () => {
  it("loads the node details into the form when opened", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue({ nome: "Mitose", descricao: "Divisão celular" });

    render(<EditNodeModal open onOpenChange={() => {}} grafoId="g1" node={node} />);

    expect(getNodeDetails).toHaveBeenCalledWith("CONCEITO", "n1");
    expect(await screen.findByDisplayValue("Mitose")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Divisão celular")).toBeInTheDocument();
  });

  it("saves edited fields via updateGraphNode, closes, and calls onSuccess", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue({ nome: "Mitose", descricao: "" });
    vi.mocked(updateGraphNode).mockResolvedValue({ success: true });
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    render(
      <EditNodeModal
        open
        onOpenChange={onOpenChange}
        grafoId="g1"
        node={node}
        onSuccess={onSuccess}
      />,
    );

    const nomeInput = await screen.findByDisplayValue("Mitose");
    await userEvent.clear(nomeInput);
    await userEvent.type(nomeInput, "Meiose");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(updateGraphNode).toHaveBeenCalled());
    expect(updateGraphNode).toHaveBeenCalledWith(
      "CONCEITO",
      "n1",
      expect.objectContaining({ nome: "Meiose" }),
      "g1",
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
  });

  it("keeps the form structure and order stable (structural net)", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue({ nome: "Mitose", descricao: "Divisão" });

    render(<EditNodeModal open onOpenChange={() => {}} grafoId="g1" node={node} />);
    await screen.findByDisplayValue("Mitose");

    expect(screen.getByRole("heading", { name: "Editar nó" })).toBeInTheDocument();
    expect(isBefore(screen.getByText("Nome"), screen.getByText("Descrição (opcional)"))).toBe(true);
    expect(
      isBefore(
        screen.getByRole("button", { name: "Cancelar" }),
        screen.getByRole("button", { name: "Salvar" }),
      ),
    ).toBe(true);
  });

  it("blocks the save when the name is empty and never calls the api", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue({ nome: "Mitose", descricao: "" });

    render(<EditNodeModal open onOpenChange={() => {}} grafoId="g1" node={node} />);

    const nomeInput = await screen.findByDisplayValue("Mitose");
    await userEvent.clear(nomeInput);
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(updateGraphNode).not.toHaveBeenCalled();
  });
});
