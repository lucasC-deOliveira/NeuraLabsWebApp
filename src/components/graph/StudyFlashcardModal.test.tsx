import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { StudyFlashcardModal } from "./StudyFlashcardModal";
import { startSingleCardStudy } from "@/lib/study-api";

vi.mock("@/lib/study-api", () => ({
  startSingleCardStudy: vi.fn(),
  submitCardReview: vi.fn(),
  finalizeStudySession: vi.fn(),
}));
vi.mock("@/lib/vault-bridge", () => ({ isDesktop: () => false, desktop: {} }));
vi.mock("@/components/flashcard/FlashcardFace", () => ({
  FlashcardFace: ({ pergunta }: { pergunta: string }) => pergunta,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("StudyFlashcardModal", () => {
  it("starts a single-card study and shows the question", async () => {
    vi.mocked(startSingleCardStudy).mockResolvedValue({
      sessionId: "s1",
      card: { id: "f1", pergunta: "O que é mitose?", resposta: "Divisão", conceito: null },
      due: true,
      proximaRevisao: null,
    });
    render(<StudyFlashcardModal open onOpenChange={vi.fn()} flashcardId="f1" />);
    expect(startSingleCardStudy).toHaveBeenCalledWith("f1");
    expect(await screen.findByText("O que é mitose?")).toBeInTheDocument();
  });
});
