import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VREditForm } from "./VREditForm";
import { getNodeDetails, updateGraphNode } from "@/lib/graph-api";

// VREditForm é DOM puro (formulário dentro do painel 3D), espelha o EditNodeModal.
vi.mock("@/lib/graph-api", () => ({
  getNodeDetails: vi.fn(),
  updateGraphNode: vi.fn(),
}));

const conceito = { id: "n1", label: "Mitose", group: "CONCEITO" } as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getNodeDetails).mockResolvedValue({ nome: "Mitose", descricao: "" });
  vi.mocked(updateGraphNode).mockResolvedValue({ success: true });
});

describe("VREditForm", () => {
  it("loads the node details into the form", async () => {
    render(<VREditForm node={conceito} grafoId="g1" onSuccess={vi.fn()} onCancel={vi.fn()} />);
    expect(getNodeDetails).toHaveBeenCalledWith("CONCEITO", "n1");
    expect(await screen.findByDisplayValue("Mitose")).toBeInTheDocument();
  });

  it("saves the edits via updateGraphNode and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    render(<VREditForm node={conceito} grafoId="g1" onSuccess={onSuccess} onCancel={vi.fn()} />);

    const input = await screen.findByDisplayValue("Mitose");
    await userEvent.clear(input);
    await userEvent.type(input, "Meiose");
    await userEvent.click(screen.getByText("Salvar"));

    expect(updateGraphNode).toHaveBeenCalledWith(
      "CONCEITO",
      "n1",
      expect.objectContaining({ nome: "Meiose" }),
      "g1",
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("cancels via the Cancelar button", async () => {
    const onCancel = vi.fn();
    render(<VREditForm node={conceito} grafoId="g1" onSuccess={vi.fn()} onCancel={onCancel} />);
    await screen.findByDisplayValue("Mitose");
    await userEvent.click(screen.getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalled();
  });
});
