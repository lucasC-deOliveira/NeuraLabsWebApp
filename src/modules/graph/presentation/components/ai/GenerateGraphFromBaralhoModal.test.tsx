import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenerateGraphFromBaralhoModal } from "./GenerateGraphFromBaralhoModal";
import { listBaralhosInGrafo, populateGraphFromBaralho } from "@/lib/ai-api";

vi.mock("@/lib/ai-api", () => ({
  listBaralhosInGrafo: vi.fn(),
  populateGraphFromBaralho: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listBaralhosInGrafo).mockResolvedValue([{ id: "b1", titulo: "Deck A", flashcardCount: 5 }]);
  vi.mocked(populateGraphFromBaralho).mockResolvedValue({
    assuntos: 1,
    topicos: 2,
    conceitos: 3,
    baralhoNome: "Deck A",
  });
});

describe("GenerateGraphFromBaralhoModal", () => {
  it("lists decks, generates from the selected one and shows the result", async () => {
    const onGenerated = vi.fn();
    render(
      <GenerateGraphFromBaralhoModal open onOpenChange={vi.fn()} grafoId="g1" onGenerated={onGenerated} />,
    );

    expect(listBaralhosInGrafo).toHaveBeenCalledWith("g1");
    await userEvent.click(await screen.findByRole("button", { name: /Deck A/ }));
    await userEvent.click(screen.getByRole("button", { name: /Expandir grafo/ }));

    await waitFor(() => expect(populateGraphFromBaralho).toHaveBeenCalledWith("g1", "b1"));
    expect(await screen.findByText("Grafo expandido com sucesso!")).toBeInTheDocument();
    expect(onGenerated).toHaveBeenCalled();
  });

  it("shows the empty state when the graph has no decks", async () => {
    vi.mocked(listBaralhosInGrafo).mockResolvedValue([]);
    render(<GenerateGraphFromBaralhoModal open onOpenChange={vi.fn()} grafoId="g1" />);
    expect(await screen.findByText(/Nenhum baralho disponível/)).toBeInTheDocument();
  });
});
