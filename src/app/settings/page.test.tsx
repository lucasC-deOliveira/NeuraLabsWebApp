import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SettingsPage from "./page";

vi.mock("@/lib/navigation", () => ({ usePathname: () => "/settings", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/components/link", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/lib/vault-bridge", () => ({ isDesktop: () => false, desktop: {} }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("SettingsPage", () => {
  it("lists the settings sections, each linking to its own screen", async () => {
    render(<SettingsPage />);
    expect(screen.getByRole("link", { name: /Aparência/ })).toHaveAttribute("href", "/settings/aparencia");
    expect(screen.getByRole("link", { name: /Flashcards/ })).toHaveAttribute("href", "/settings/flashcards");
    expect(screen.getByRole("link", { name: /Conexão com IA/ })).toHaveAttribute("href", "/settings/ia");
  });

  it("summarizes what is inside each section", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Chave da API, endereço e modelo")).toBeInTheDocument();
  });

  // Vault e Claude Code não existem no navegador — a entrada não deve aparecer lá.
  it("hides the desktop section outside the desktop app", () => {
    render(<SettingsPage />);
    expect(screen.queryByText("Desktop")).not.toBeInTheDocument();
  });
});
