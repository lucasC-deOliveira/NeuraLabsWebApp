import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import NewProvaPage from "./page";
import { listQuestoes } from "@/lib/questions-api";

vi.mock("@/lib/provas-api", () => ({
  createProva: vi.fn(),
  createProvaFromParsed: vi.fn(),
  parseProvaUpload: vi.fn(),
}));
vi.mock("@/lib/questions-api", () => ({ listQuestoes: vi.fn(() => Promise.resolve([])) }));
vi.mock("@/lib/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("NewProvaPage (smoke)", () => {
  it("mounts and loads the questions for selection", async () => {
    render(<NewProvaPage />);
    await waitFor(() => expect(listQuestoes).toHaveBeenCalled());
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});
