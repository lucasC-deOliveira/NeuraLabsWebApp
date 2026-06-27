import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { StudyDeckModal } from "./StudyDeckModal";
import { startDeckStudy } from "@/lib/study-api";

vi.mock("@/lib/study-api", () => ({
  startDeckStudy: vi.fn(),
  submitCardReview: vi.fn(),
  finalizeStudySession: vi.fn(),
}));
vi.mock("@/lib/vault-bridge", () => ({ isDesktop: () => false, desktop: {} }));
vi.mock("@/components/flashcard/FlashcardFace", () => ({
  FlashcardFace: ({ pergunta }: { pergunta: string }) => pergunta,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("StudyDeckModal", () => {
  it("starts the deck study and shows the first card", async () => {
    vi.mocked(startDeckStudy).mockResolvedValue({
      sessionId: "s1",
      titulo: "Deck A",
      cards: [{ id: "c1", pergunta: "Primeira pergunta?", resposta: "R1", conceito: null }],
      totalNoDeck: 1,
    });
    render(<StudyDeckModal open onOpenChange={vi.fn()} baralhoId="b1" />);
    expect(startDeckStudy).toHaveBeenCalledWith("b1");
    expect(await screen.findByText("Primeira pergunta?")).toBeInTheDocument();
  });
});
