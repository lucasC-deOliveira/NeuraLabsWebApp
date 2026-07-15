import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProvaDetailPage from "./page";
import { getProva } from "@/lib/provas-api";

vi.mock("@/lib/provas-api", () => ({ getProva: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useParams: () => ({ id: "p1" }),
}));
vi.mock("@/lib/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("ProvaDetailPage", () => {
  it("loads the prova by id and renders its title", async () => {
    vi.mocked(getProva).mockResolvedValue({
      id: "p1",
      titulo: "Prova de Bio",
      descricao: null,
      dataCriacao: "2024-01-01",
      questoes: [],
    });
    render(<ProvaDetailPage />);
    expect(getProva).toHaveBeenCalledWith("p1");
    // O título aparece no h1 e no fim da trilha do header — checa o h1.
    expect(await screen.findByRole("heading", { name: "Prova de Bio" })).toBeInTheDocument();
  });
});
