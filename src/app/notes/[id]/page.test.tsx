import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import NotaDetailPage from "./page";
import { getNotaById } from "@/lib/notes-api";

vi.mock("@/lib/notes-api", () => ({ getNotaById: vi.fn(), generateFlashcardsFromNota: vi.fn() }));
vi.mock("@/lib/navigation", () => ({ usePathname: () => "/",
  useParams: () => ({ id: "n1" }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/markdown-content", () => ({
  MarkdownContent: ({ children }: { children: string }) => children,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("NotaDetailPage", () => {
  it("loads the nota by id and renders its content", async () => {
    vi.mocked(getNotaById).mockResolvedValue({
      id: "n1",
      conteudo: "Conteúdo da nota",
      dataCriacao: new Date("2024-01-01"),
      conceitosRelacionados: [],
      subtipo: null,
      tipoNota: "PERMANENTE",
    });
    render(<NotaDetailPage />);
    expect(getNotaById).toHaveBeenCalledWith("n1");
    expect(await screen.findByText("Conteúdo da nota")).toBeInTheDocument();
  });
});
