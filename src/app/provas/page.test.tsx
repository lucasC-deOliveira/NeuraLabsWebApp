import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProvasPage from "./page";
import { listProvas } from "@/lib/provas-api";

vi.mock("@/lib/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/provas-api", () => ({ listProvas: vi.fn(), deleteProva: vi.fn() }));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("ProvasPage", () => {
  it("loads and lists the user's provas", async () => {
    vi.mocked(listProvas).mockResolvedValue([
      { id: "p1", titulo: "Prova de Bio", descricao: null, totalQuestoes: 10, dataCriacao: "2024-01-01" },
    ]);
    render(<ProvasPage />);
    expect(listProvas).toHaveBeenCalled();
    expect(await screen.findByText("Prova de Bio")).toBeInTheDocument();
  });
});
