import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { authApi } from "@/lib/api";
import { Sidebar } from "./sidebar";

vi.mock("@/lib/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/api", () => ({ authApi: { me: vi.fn(() => Promise.resolve(null)), logout: vi.fn() } }));
vi.mock("@/components/link", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

describe("Sidebar (smoke)", () => {
  it("keeps the legacy light and dark switch out of the desktop and mobile menu", async () => {
    vi.mocked(authApi.me).mockResolvedValueOnce(null);
    render(<Sidebar />);
    await screen.findByText("Fazer login");
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("button", { name: "Fechar menu" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ativar tema (claro|escuro)/ })).not.toBeInTheDocument();
  });

  it("offers to retry an unavailable session check and restores the account after recovery", async () => {
    vi.mocked(authApi.me)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ id: "u1", nome: "Ada", email: "ada@example.com" });

    render(<Sidebar />);
    const retry = await screen.findByRole("button", { name: "Tentar verificar a sessão novamente" });
    expect(screen.queryByText("Fazer login")).not.toBeInTheDocument();
    fireEvent.click(retry);
    expect(await screen.findByText("Ada")).toBeInTheDocument();
  });

  it("renders the navigation links", () => {
    render(<Sidebar collapsed={false} onToggleCollapse={vi.fn()} />);
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
  });
});
