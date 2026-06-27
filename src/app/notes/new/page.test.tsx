import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NewNotaPage from "./page";

vi.mock("@/lib/ai-api", () => ({ analyzeRawText: vi.fn(), saveSelectedNotas: vi.fn() }));
vi.mock("@/lib/notes-api", () => ({ createNotaManual: vi.fn() }));
vi.mock("@/lib/content-api", () => ({
  getHierarquiaConceitos: vi.fn(() => Promise.resolve([])),
  createFullConcept: vi.fn(),
  createTopico: vi.fn(),
  createAssunto: vi.fn(),
}));
vi.mock("@/lib/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("NewNotaPage (smoke)", () => {
  it("mounts the new-note page", () => {
    render(<NewNotaPage />);
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});
