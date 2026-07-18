import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BridgesModal } from "./BridgesModal";
import { suggestBridges, applyAutoLink } from "@/lib/ai-api";

// O adapter delega para @/lib/ai-api, então mockar a borda cobre o fluxo.
vi.mock("@/lib/ai-api", () => ({ suggestBridges: vi.fn(), applyAutoLink: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const bridge = {
  sourceId: "a",
  targetId: "b",
  sourceNome: "Pilha de Chamadas e Gerenciamento de Memória",
  targetNome: "Pilha de Chamadas",
  sourceGrafoNome: "teste",
  targetGrafoNome: "Ciência da Computação",
  relacao: "PART_OF",
  motivo: "Mesma estrutura vista em dois níveis",
  similaridade: 0.93,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(suggestBridges).mockResolvedValue({ suggestions: [bridge] });
  vi.mocked(applyAutoLink).mockResolvedValue({ added: 1 });
});

describe("BridgesModal", () => {
  it("loads bridges on open and writes the selected ones through the auto-link endpoint", async () => {
    const onApplied = vi.fn();
    const onOpenChange = vi.fn();
    render(<BridgesModal open onOpenChange={onOpenChange} grafoId="g1" onApplied={onApplied} />);

    expect(suggestBridges).toHaveBeenCalledWith("g1");
    await userEvent.click(await screen.findByRole("button", { name: /Criar pontes selecionadas/ }));

    await waitFor(() =>
      expect(applyAutoLink).toHaveBeenCalledWith("g1", [
        { sourceId: "a", targetId: "b", relacao: "PART_OF" },
      ]),
    );
    expect(onApplied).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // A origem de cada ponta é o que distingue isto do auto-link: sem ela o usuário
  // não tem como julgar a ponte.
  it("shows which graph each end of the bridge comes from", async () => {
    render(<BridgesModal open onOpenChange={vi.fn()} grafoId="g1" onApplied={vi.fn()} />);

    expect(await screen.findByText("Ciência da Computação")).toBeInTheDocument();
    expect(screen.getByText("teste")).toBeInTheDocument();
    expect(screen.getByText("93%")).toBeInTheDocument();
  });

  it("explains the empty case instead of looking broken", async () => {
    vi.mocked(suggestBridges).mockResolvedValue({ suggestions: [] });
    render(<BridgesModal open onOpenChange={vi.fn()} grafoId="g1" onApplied={vi.fn()} />);

    expect(await screen.findByText(/Nenhuma ponte nova/)).toBeInTheDocument();
    expect(applyAutoLink).not.toHaveBeenCalled();
  });

  it("shows an error state when the search fails", async () => {
    vi.mocked(suggestBridges).mockRejectedValue(new Error("falhou"));
    render(<BridgesModal open onOpenChange={vi.fn()} grafoId="g1" onApplied={vi.fn()} />);

    expect(await screen.findByText("falhou")).toBeInTheDocument();
  });
});
