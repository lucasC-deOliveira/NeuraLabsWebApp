import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditNodeModal } from "./EditNodeModal";
import { getNodeDetails, updateGraphNode } from "@/lib/graph-api";

// Characterization test (safety net before the hexagonal refactor moves/decomposes
// this modal). Captures the current observable behavior with the HTTP layer mocked.
// The CONCEITO node path is the simplest form (nome + descrição, no Select).
vi.mock("@/lib/graph-api", () => ({
  getNodeDetails: vi.fn(),
  updateGraphNode: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const node = { id: "n1", group: "CONCEITO", label: "Mitose" };

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

  it("blocks the save when the name is empty and never calls the api", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue({ nome: "Mitose", descricao: "" });

    render(<EditNodeModal open onOpenChange={() => {}} grafoId="g1" node={node} />);

    const nomeInput = await screen.findByDisplayValue("Mitose");
    await userEvent.clear(nomeInput);
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(updateGraphNode).not.toHaveBeenCalled();
  });
});
