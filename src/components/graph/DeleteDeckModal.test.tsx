import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteDeckModal } from "./DeleteDeckModal";

function setup() {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <DeleteDeckModal open onOpenChange={onOpenChange} deckLabel="Meu Deck" onConfirm={onConfirm} />,
  );
  return { onConfirm, onOpenChange };
}

describe("DeleteDeckModal", () => {
  it("confirms deleting only the deck (deleteConnected=false)", async () => {
    const { onConfirm } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Excluir só o baralho/ }));
    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it("confirms deleting the deck and its connected nodes (deleteConnected=true)", async () => {
    const { onConfirm } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Excluir baralho e nós conectados/ }));
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it("cancels without confirming", async () => {
    const { onConfirm, onOpenChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
