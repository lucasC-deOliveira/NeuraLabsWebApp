import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudyPage } from "./StudyPage";
import { startStudySession, submitCardReview } from "@/lib/study-api";

vi.mock("@/lib/study-api", () => ({
  startStudySession: vi.fn(),
  submitCardReview: vi.fn(() => Promise.resolve({ success: true })),
  endStudySession: vi.fn(() => Promise.resolve({ success: true })),
}));
vi.mock("@/lib/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/components/markdown-content", () => ({
  MarkdownContent: ({ children }: { children: string }) => <span>{children}</span>,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("StudyPage flow", () => {
  it("submits a review after reveal → acertei → confidence (regression: cards ref not stale)", async () => {
    vi.mocked(startStudySession).mockResolvedValue({
      sessionId: "s1",
      cards: [{ id: "c1", pergunta: "2+2?", resposta: "4", conceito: "math" }],
    });
    render(<StudyPage />);

    // Wait for the loaded question, then reveal the answer.
    const reveal = await screen.findByRole("button", { name: /Ver Resposta/i });
    await userEvent.click(reveal);

    // Mark correct, then pick a confidence level (4 → grade "good").
    await userEvent.click(screen.getByRole("button", { name: /Acertei/i }));
    await userEvent.click(screen.getByRole("button", { name: /4.*Confiante/i }));

    await waitFor(() =>
      expect(submitCardReview).toHaveBeenCalledWith(
        expect.objectContaining({ flashcardId: "c1", grade: "good" }),
      ),
    );
  });
});
