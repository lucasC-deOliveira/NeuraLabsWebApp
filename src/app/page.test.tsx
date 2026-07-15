import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import Home from "./page";
import { getSubjects, getStudySessionHistory, getFlashcards } from "@/lib/content-api";

vi.mock("@/lib/content-api", () => ({
  getSubjects: vi.fn(() => Promise.resolve([])),
  getStudySessionHistory: vi.fn(() => Promise.resolve([])),
  getFlashcards: vi.fn(() => Promise.resolve([])),
}));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/lib/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }));

beforeEach(() => vi.clearAllMocks());

describe("Home (dashboard)", () => {
  it("loads the dashboard data on mount", async () => {
    render(<Home />);
    await waitFor(() => expect(getSubjects).toHaveBeenCalled());
    expect(getStudySessionHistory).toHaveBeenCalled();
    expect(getFlashcards).toHaveBeenCalled();
  });
});
