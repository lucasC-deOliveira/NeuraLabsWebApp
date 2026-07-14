import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImproveFlashcardModal } from "./ImproveFlashcardModal";
import { graphHttp } from "@/modules/graph/infra/http";

vi.mock("@/modules/graph/infra/http", () => ({
  graphHttp: { getNodeDetails: vi.fn(), improveFlashcard: vi.fn(), updateGraphNode: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(graphHttp.getNodeDetails).mockResolvedValue({ pergunta: "orig q", resposta: "orig a" } as never);
  vi.mocked(graphHttp.improveFlashcard).mockResolvedValue({ pergunta: "melhor q", resposta: "melhor a" });
  vi.mocked(graphHttp.updateGraphNode).mockResolvedValue({ success: true });
});

function open() {
  const onApplied = vi.fn();
  render(<ImproveFlashcardModal open onOpenChange={vi.fn()} flashcardId="f1" grafoId="g1" onApplied={onApplied} />);
  return { onApplied };
}

describe("ImproveFlashcardModal", () => {
  it("improves with the chosen operations, previews, and applies the result", async () => {
    const { onApplied } = open();
    expect(await screen.findByText("Estilo Markdown")).toBeInTheDocument(); // carregou o flashcard

    await userEvent.click(screen.getByRole("button", { name: /Melhorar com IA/ }));

    expect(graphHttp.improveFlashcard).toHaveBeenCalledWith({
      pergunta: "orig q",
      resposta: "orig a",
      operations: ["format", "markdown"], // defaults marcados
    });
    expect(await screen.findByText("melhor a")).toBeInTheDocument(); // preview da versão melhorada

    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(graphHttp.updateGraphNode).toHaveBeenCalledWith(
      "FLASHCARD",
      "f1",
      { pergunta: "melhor q", resposta: "melhor a" },
      "g1",
    );
    expect(onApplied).toHaveBeenCalled();
  });

  it("lets the user deselect an operation before improving", async () => {
    open();
    await screen.findByText("Estilo Markdown");
    await userEvent.click(screen.getByText("Estilo Markdown")); // desmarca (estava no default)
    await userEvent.click(screen.getByRole("button", { name: /Melhorar com IA/ }));
    expect(graphHttp.improveFlashcard).toHaveBeenCalledWith(
      expect.objectContaining({ operations: ["format"] }),
    );
  });
});
