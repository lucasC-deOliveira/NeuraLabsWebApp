import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteGraphModal } from "./DeleteGraphModal";

const ALL_KEEP = ["FLASHCARD", "NOTA", "BARALHO", "QUESTION", "PROVA", "TEXTO_BRUTO"];

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

describe("DeleteGraphModal", () => {
  it("shows the graph name and keeps all reusable types by default", () => {
    setup();
    expect(screen.getByText(/Biologia/)).toBeInTheDocument();
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(6);
    expect(boxes.every((b) => (b as HTMLInputElement).checked)).toBe(true);
  });

  it("confirms with every keepable type when nothing is unchecked", async () => {
    const { onConfirm } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Excluir grafo/ }));
    expect(onConfirm).toHaveBeenCalledWith(ALL_KEEP);
  });

  it("drops a type from keep when its checkbox is unchecked", async () => {
    const { onConfirm } = setup();
    await userEvent.click(screen.getByLabelText("Flashcards"));
    await userEvent.click(screen.getByRole("button", { name: /Excluir grafo/ }));
    expect(onConfirm).toHaveBeenCalledWith(["NOTA", "BARALHO", "QUESTION", "PROVA", "TEXTO_BRUTO"]);
  });

  it("cancels without confirming", async () => {
    const { onOpenChange, onConfirm } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
