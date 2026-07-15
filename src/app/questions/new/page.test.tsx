import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NewQuestaoPage from "./page";

vi.mock("@/lib/questions-api", () => ({ createQuestao: vi.fn() }));
vi.mock("@/lib/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("NewQuestaoPage (smoke)", () => {
  it("mounts the new-question form", () => {
    render(<NewQuestaoPage />);
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});
