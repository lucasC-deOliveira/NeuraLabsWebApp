import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ViewDeckModal } from "./ViewDeckModal";
import { getDeckForStudy } from "@/lib/graph-api";

vi.mock("@/lib/graph-api", () => ({ getDeckForStudy: vi.fn() }));
vi.mock("@/lib/vault-bridge", () => ({ isDesktop: () => false }));
vi.mock("@/lib/vault-sync", () => ({ readAllVaultNodes: vi.fn() }));
vi.mock("@/components/markdown-content", () => ({
  MarkdownContent: ({ children }: { children: string }) => children,
}));

beforeEach(() => vi.clearAllMocks());

describe("ViewDeckModal", () => {
  it("loads the deck and lists its cards", async () => {
    vi.mocked(getDeckForStudy).mockResolvedValue({
      titulo: "Deck A",
      cards: [{ id: "c1", pergunta: "O que é mitose?", resposta: "Divisão", conceito: null }],
    });
    render(<ViewDeckModal open onOpenChange={vi.fn()} baralhoId="b1" />);
    expect(getDeckForStudy).toHaveBeenCalledWith("b1");
    expect(await screen.findByText("O que é mitose?")).toBeInTheDocument();
  });
});
