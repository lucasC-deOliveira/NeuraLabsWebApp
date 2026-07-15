import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import NewFlashcardPage from "./page";
import { getNotas } from "@/lib/notes-api";

vi.mock("@/lib/notes-api", () => ({ getNotas: vi.fn(() => Promise.resolve([])) }));
vi.mock("@/lib/content-api", () => ({
  getHierarquiaConceitos: vi.fn(() => Promise.resolve([])),
  createFullConcept: vi.fn(),
  createTopico: vi.fn(),
  createAssunto: vi.fn(),
  createFlashcard: vi.fn(),
  previewFlashcardsFromNota: vi.fn(),
  saveFlashcardPreviewsFromNota: vi.fn(),
}));
vi.mock("@/lib/ai-api", () => ({ generateFlashcardsViaIA: vi.fn() }));
vi.mock("@/lib/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("NewFlashcardPage (smoke)", () => {
  it("mounts and loads the notas for sourcing", async () => {
    render(<NewFlashcardPage />);
    await waitFor(() => expect(getNotas).toHaveBeenCalled());
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});
