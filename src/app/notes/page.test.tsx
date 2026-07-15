import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import NotesPage from "./page";
import { getNotas, getNotasFilterData } from "@/lib/notes-api";

vi.mock("@/lib/notes-api", () => ({
  getNotas: vi.fn(),
  getNotasFilterData: vi.fn(),
  deleteNota: vi.fn(),
  deleteAllNotas: vi.fn(),
  generateFlashcardsFromNota: vi.fn(),
}));
vi.mock("@/components/link", () => ({ Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/lib/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getNotasFilterData).mockResolvedValue([]);
});

describe("NotesPage", () => {
  it("loads and lists the user's notas", async () => {
    vi.mocked(getNotas).mockResolvedValue([
      {
        id: "n1",
        titulo: "Minha Nota",
        preview: "preview",
        dataCriacao: new Date("2024-01-01"),
        conceitosRelacionados: [],
        flashcardCount: 0,
        wordCount: 10,
        subtipo: null,
        tipoNota: "PERMANENTE",
      },
    ]);
    render(<NotesPage />);
    expect(getNotas).toHaveBeenCalled();
    expect(await screen.findByText("Minha Nota")).toBeInTheDocument();
  });
});
