import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import FlashcardsPage from "./page";
import { getFlashcards } from "@/lib/content-api";

vi.mock("@/lib/content-api", () => ({
  getFlashcards: vi.fn(() => Promise.resolve([])),
  getFlashcardFilterData: vi.fn(() => Promise.resolve([])),
  getConceptHierarchy: vi.fn(() => Promise.resolve([])),
  createFlashcard: vi.fn(),
  deleteFlashcard: vi.fn(),
  deleteAllFlashcards: vi.fn(),
}));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/lib/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/components/flashcard/CardStyleProvider", () => ({
  useCardStyle: () => ({ cardStyle: "default", setCardStyle: vi.fn() }),
}));
vi.mock("@/components/flashcard/FlashcardFace", () => ({ FlashcardFace: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("FlashcardsPage (smoke)", () => {
  it("loads the flashcards on mount", async () => {
    render(<FlashcardsPage />);
    await waitFor(() => expect(getFlashcards).toHaveBeenCalled());
  });
});
