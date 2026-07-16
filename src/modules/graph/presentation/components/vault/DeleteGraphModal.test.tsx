import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteGraphModal } from "./DeleteGraphModal";

function setup(overrides: Record<string, unknown> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <DeleteGraphModal
      open
      onOpenChange={onOpenChange}
      graphName="Biologia"
      onConfirm={onConfirm}
      {...overrides}
    />,
  );
  return { onConfirm, onOpenChange };
}

// O modal tinha seis caixas de seleção ("manter flashcards? notas? baralhos?"),
// porque apagar o grafo apagava as entidades. Com o nó do sistema ele apaga só a
// VISTA — não sobrou o que escolher, e o modal passou a explicar em vez de perguntar.
describe("DeleteGraphModal", () => {
  it("names the graph being deleted", () => {
    setup();
    expect(screen.getByText(/Biologia/)).toBeInTheDocument();
  });

  // A garantia que o usuário precisa ler antes de clicar em algo destrutivo.
  it("promises the content survives, and says where to delete it for real", () => {
    setup();
    expect(screen.getByText(/Nada do conteúdo é apagado/)).toBeInTheDocument();
    expect(screen.getByText(/continuam no sistema/)).toBeInTheDocument();
    expect(screen.getByText(/exclua o nó dele/)).toBeInTheDocument();
  });

  it("has nothing left to choose", () => {
    setup();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("confirms with no arguments", async () => {
    const { onConfirm } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Excluir grafo/ }));
    expect(onConfirm).toHaveBeenCalledWith();
  });

  it("cancels without confirming", async () => {
    const { onOpenChange, onConfirm } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
