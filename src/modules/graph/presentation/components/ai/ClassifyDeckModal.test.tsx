import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClassifyDeckModal } from "./ClassifyDeckModal";
import { planDeckClassificationChunk, applyDeckClassificationChunk } from "@/lib/ai-api";

// O adapter delega para @/lib/ai-api, então mockar a borda cobre o fluxo.
vi.mock("@/lib/ai-api", () => ({
  planDeckClassificationChunk: vi.fn(),
  applyDeckClassificationChunk: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CHUNK = {
  baralhoNome: "NODEJS",
  totalCards: 60,
  classifiedCards: 30,
  chunkCards: [{ id: "fc1", pergunta: "P1", resposta: "R1" }],
  plan: {
    assuntos: [{ nome: "Backend", descricao: "" }],
    topicos: [{ nome: "Node", assunto: "Backend", descricao: "" }],
    conceitos: [{ nome: "Event loop", topico: "Node", descricao: "", flashcardIds: ["fc1"] }],
  },
};

const DONE_CHUNK = { ...CHUNK, classifiedCards: 60, chunkCards: [], plan: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(planDeckClassificationChunk).mockResolvedValue(CHUNK);
  vi.mocked(applyDeckClassificationChunk).mockResolvedValue({
    assuntos: 1,
    topicos: 1,
    conceitos: 1,
    linkedCards: 1,
  });
});

describe("ClassifyDeckModal", () => {
  it("plans a chunk on open, applies it and advances to the next one", async () => {
    vi.mocked(planDeckClassificationChunk)
      .mockResolvedValueOnce(CHUNK)
      .mockResolvedValueOnce(DONE_CHUNK);
    const onApplied = vi.fn();
    render(
      <ClassifyDeckModal open onOpenChange={vi.fn()} grafoId="g1" baralhoId="d1" onApplied={onApplied} />,
    );

    expect(await screen.findByText("Event loop")).toBeInTheDocument();
    expect(screen.getByText(/Lote 2\/2/)).toBeInTheDocument();
    expect(planDeckClassificationChunk).toHaveBeenCalledWith("g1", "d1", 30);

    await userEvent.click(screen.getByRole("button", { name: /Aplicar lote/ }));

    await waitFor(() =>
      expect(applyDeckClassificationChunk).toHaveBeenCalledWith("g1", "d1", CHUNK.plan),
    );
    expect(await screen.findByText(/Acervo classificado: 60\/60/)).toBeInTheDocument();
  });

  it("shows the done view without applying when nothing is pending", async () => {
    vi.mocked(planDeckClassificationChunk).mockResolvedValue(DONE_CHUNK);
    render(
      <ClassifyDeckModal open onOpenChange={vi.fn()} grafoId="g1" baralhoId="d1" onApplied={vi.fn()} />,
    );
    expect(await screen.findByText(/Acervo classificado/)).toBeInTheDocument();
    expect(applyDeckClassificationChunk).not.toHaveBeenCalled();
  });

  it("shows an error state when planning fails", async () => {
    vi.mocked(planDeckClassificationChunk).mockRejectedValue(new Error("falhou"));
    render(
      <ClassifyDeckModal open onOpenChange={vi.fn()} grafoId="g1" baralhoId="d1" onApplied={vi.fn()} />,
    );
    expect(await screen.findByText("falhou")).toBeInTheDocument();
  });
});
