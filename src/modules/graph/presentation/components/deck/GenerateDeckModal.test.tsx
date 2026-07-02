import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenerateDeckModal } from "./GenerateDeckModal";

function setup(overrides: Record<string, unknown> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <GenerateDeckModal
      open
      onOpenChange={onOpenChange}
      defaultTitle="Baralho de Bio"
      flashcardCount={3}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );
  return { onConfirm, onOpenChange };
}

describe("GenerateDeckModal", () => {
  it("prefills the title and confirms with the edited value", async () => {
    const { onConfirm } = setup();
    const input = screen.getByDisplayValue("Baralho de Bio");
    await userEvent.clear(input);
    await userEvent.type(input, "Novo Deck");
    await userEvent.click(screen.getByRole("button", { name: /Gerar baralho/ }));
    expect(onConfirm).toHaveBeenCalledWith("Novo Deck");
  });

  it("confirms on Enter", async () => {
    const { onConfirm } = setup();
    await userEvent.type(screen.getByDisplayValue("Baralho de Bio"), "{Enter}");
    expect(onConfirm).toHaveBeenCalledWith("Baralho de Bio");
  });

  it("shows the empty-state and no generate button when there are no flashcards", () => {
    setup({ flashcardCount: 0 });
    expect(screen.getByText(/Nenhum flashcard conectado/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gerar baralho/ })).toBeNull();
  });
});
