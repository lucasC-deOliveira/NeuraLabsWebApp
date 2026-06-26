import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateSubgrafoModal } from "./CreateSubgrafoModal";
import { createSubgrafo } from "@/lib/graph-api";

vi.mock("@/lib/graph-api", () => ({
  createSubgrafo: vi.fn(() => Promise.resolve({ grafoId: "sg1", grafoRefNodeId: "ref1" })),
  GRAFO_REF_RELATIONS: [
    { value: "APROFUNDA", label: "Aprofunda" },
    { value: "DERIVA_DE", label: "Deriva de" },
  ],
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("CreateSubgrafoModal", () => {
  it("creates a subgraph and notifies the parent", async () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    render(
      <CreateSubgrafoModal open onClose={onClose} parentGrafoId="parent" onCreated={onCreated} />,
    );

    await userEvent.type(screen.getByPlaceholderText("Ex: Álgebra Linear"), "Álgebra");
    await userEvent.click(screen.getByRole("button", { name: /Criar subgrafo/ }));

    await waitFor(() => expect(createSubgrafo).toHaveBeenCalled());
    expect(createSubgrafo).toHaveBeenCalledWith("parent", {
      nome: "Álgebra",
      descricao: undefined,
      tipoRelacao: "APROFUNDA",
    });
    expect(onCreated).toHaveBeenCalledWith("sg1", "ref1");
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the create button disabled until a name is typed", async () => {
    render(<CreateSubgrafoModal open onClose={vi.fn()} parentGrafoId="parent" onCreated={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Criar subgrafo/ })).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText("Ex: Álgebra Linear"), "X");
    expect(screen.getByRole("button", { name: /Criar subgrafo/ })).toBeEnabled();
  });
});
