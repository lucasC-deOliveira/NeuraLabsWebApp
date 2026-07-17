import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommunitiesPanel } from "./CommunitiesPanel";

const community = {
  id: "c1",
  label: "Biologia",
  color: "#22c55e",
  nodes: [{ group: "CONCEITO" }, { group: "FLASHCARD" }],
} as never;

function setup(communities: unknown[] = [community]) {
  const onCreateDeck = vi.fn();
  const onSummarizeCommunity = vi.fn();
  const onHighlightCommunity = vi.fn();
  render(
    <CommunitiesPanel
      open
      onOpenChange={vi.fn()}
      communities={communities as never}
      onSelectCommunity={vi.fn()}
      onCreateDeck={onCreateDeck}
      onHighlightCommunity={onHighlightCommunity}
      onSummarizeCommunity={onSummarizeCommunity}
    />,
  );
  return { onCreateDeck, onSummarizeCommunity };
}

describe("CommunitiesPanel", () => {
  it("lists a cluster and wires the summarize and create-deck actions", async () => {
    const { onCreateDeck, onSummarizeCommunity } = setup();
    expect(screen.getByText("Biologia")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Resumir/ }));
    expect(onSummarizeCommunity).toHaveBeenCalledWith(community);

    await userEvent.click(screen.getByRole("button", { name: /Criar baralho/ }));
    expect(onCreateDeck).toHaveBeenCalledWith(community);
  });

  it("shows the guidance note when there are no clusters", () => {
    setup([]);
    expect(screen.getByText(/Adicione assuntos, tópicos e conceitos/)).toBeInTheDocument();
  });
});
