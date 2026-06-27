import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import StudyPage from "./page";
import { startStudySession } from "@/lib/study-api";

vi.mock("@/lib/study-api", () => ({
  startStudySession: vi.fn(() => Promise.resolve({ sessionId: "s1", cards: [] })),
  submitCardReview: vi.fn(),
  endStudySession: vi.fn(),
}));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/lib/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/components/markdown-content", () => ({
  MarkdownContent: ({ children }: { children: string }) => children,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("StudyPage (smoke)", () => {
  it("starts a study session on mount", async () => {
    render(<StudyPage />);
    await waitFor(() => expect(startStudySession).toHaveBeenCalled());
  });
});
