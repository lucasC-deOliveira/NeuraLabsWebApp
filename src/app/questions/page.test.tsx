import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import QuestoesPage from "./page";
import { listQuestoes } from "@/lib/questions-api";

vi.mock("@/lib/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/questions-api", () => ({ listQuestoes: vi.fn(), deleteQuestao: vi.fn() }));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("QuestoesPage", () => {
  it("loads and lists the user's questions", async () => {
    vi.mocked(listQuestoes).mockResolvedValue([
      {
        id: "q1",
        tipo: "MULTIPLA_ESCOLHA",
        enunciado: "Qual é a capital?",
        gabarito: "A",
        explicacao: null,
        conceitosConectados: [],
        alternativas: null,
        conceitoId: null,
        conceitoNome: null,
        dataCriacao: "2024-01-01",
      },
    ]);
    render(<QuestoesPage />);
    expect(listQuestoes).toHaveBeenCalled();
    expect(await screen.findByText("Qual é a capital?")).toBeInTheDocument();
  });

  it("shows a zero count when there are no questions", async () => {
    vi.mocked(listQuestoes).mockResolvedValue([]);
    render(<QuestoesPage />);
    expect(await screen.findByText(/^0 quest/)).toBeInTheDocument();
  });
});
