import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ViewNotaModal } from "./ViewNotaModal";
import { getNodeDetails } from "@/lib/graph-api";

vi.mock("@/lib/graph-api", () => ({ getNodeDetails: vi.fn() }));
vi.mock("@/lib/vault-bridge", () => ({ isDesktop: () => false, desktop: {} }));
vi.mock("@/components/markdown-content", () => ({
  MarkdownContent: ({ children }: { children: string }) => children,
}));

beforeEach(() => vi.clearAllMocks());

describe("ViewNotaModal", () => {
  it("loads the nota and renders its title and content", async () => {
    vi.mocked(getNodeDetails).mockResolvedValue({
      titulo: "Minha Nota",
      conteudo: "Conteúdo da nota",
      tipoNota: "PERMANENTE",
      subtipo: "DEFINICAO",
    });
    render(<ViewNotaModal open onOpenChange={vi.fn()} notaId="n1" />);
    expect(getNodeDetails).toHaveBeenCalledWith("NOTA", "n1");
    expect(await screen.findByText("Minha Nota")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo da nota")).toBeInTheDocument();
  });
});
