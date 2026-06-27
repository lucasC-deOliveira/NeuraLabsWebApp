import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./sidebar";

vi.mock("@/lib/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/api", () => ({ authApi: { me: vi.fn(() => Promise.resolve(null)), logout: vi.fn() } }));
vi.mock("@/components/link", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("./theme-toggle", () => ({ ThemeToggle: () => null }));

describe("Sidebar (smoke)", () => {
  it("renders the navigation links", () => {
    render(<Sidebar collapsed={false} onToggleCollapse={vi.fn()} />);
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
  });
});
