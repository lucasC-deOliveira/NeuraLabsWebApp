import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ViewFlashcardModal } from "./ViewFlashcardModal";
import { getNodeDetails } from "@/lib/graph-api";

vi.mock("@/lib/graph-api", () => ({ getNodeDetails: vi.fn() }));
vi.mock("@/lib/vault-bridge", () => ({ isDesktop: () => false }));
vi.mock("@/lib/vault-sync", () => ({ findVaultNode: vi.fn() }));
vi.mock("@/components/flashcard/FlashcardFace", () => ({
  FlashcardFace: ({ pergunta, resposta }: { pergunta: string; resposta: string }) =>
    `${pergunta} :: ${resposta}`,
}));

beforeEach(() => vi.clearAllMocks());

describe("ViewFlashcardModal", () => {
  it("loads the flashcard details and renders its face", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue({ pergunta: "O que é mitose?", resposta: "Divisão" });
    render(<ViewFlashcardModal open onOpenChange={vi.fn()} flashcardId="f1" />);
    expect(getNodeDetails).toHaveBeenCalledWith("FLASHCARD", "f1");
    expect(await screen.findByText("O que é mitose? :: Divisão")).toBeInTheDocument();
  });

  it("shows an error message when the flashcard cannot be loaded", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue(null);
    render(<ViewFlashcardModal open onOpenChange={vi.fn()} flashcardId="f1" />);
    expect(await screen.findByText(/Não foi possível carregar este flashcard/)).toBeInTheDocument();
  });
});
