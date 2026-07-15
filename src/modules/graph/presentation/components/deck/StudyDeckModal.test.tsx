import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudyDeckModal } from "./StudyDeckModal";
import { startDeckStudy, submitCardReview, finalizeStudySession, type ApiDeckCard } from "@/lib/study-api";

vi.mock("@/lib/study-api", () => ({
  startDeckStudy: vi.fn(),
  submitCardReview: vi.fn(),
  finalizeStudySession: vi.fn(),
}));
vi.mock("@/lib/vault-bridge", () => ({ isDesktop: () => false, desktop: {} }));
vi.mock("@/components/flashcard/FlashcardFace", () => ({
  FlashcardFace: ({ pergunta }: { pergunta: string }) => pergunta,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  // finalizeSession faz .catch() no retorno: o mock precisa devolver uma promise.
  vi.mocked(finalizeStudySession).mockResolvedValue({ success: true });
});

describe("StudyDeckModal", () => {
  it("starts the deck study and shows the first card", async () => {
    vi.mocked(startDeckStudy).mockResolvedValue({
      sessionId: "s1",
      titulo: "Deck A",
      cards: [
        {
          id: "c1",
          pergunta: "Primeira pergunta?",
          resposta: "R1",
          conceito: null,
          // Card novo: sem agendamento (a API manda proximaRevisao nula).
          fase: "LEARN",
          learningStep: 0,
          dificuldade: 5,
          intervalo: 0,
          fatorEase: 2.5,
          proximaRevisao: null,
          ultimaRevisao: null,
        },
      ],
      totalNoDeck: 1,
    });
    render(<StudyDeckModal open onOpenChange={vi.fn()} baralhoId="b1" />);
    expect(startDeckStudy).toHaveBeenCalledWith("b1");
    expect(await screen.findByText("Primeira pergunta?")).toBeInTheDocument();
  });

  // Regressão: a fila só olhava a FASE do card (LEARN/RELEARN) e o repetia na hora,
  // sem consultar proximaRevisao — então o "10 min" do botão não valia nada dentro
  // da sessão e o card voltava em segundos.
  describe("respeita o horário do reagendamento", () => {
    const novoCard = (id: string, pergunta: string): ApiDeckCard => ({
      id,
      pergunta,
      resposta: "R",
      conceito: null,
      fase: "LEARN",
      learningStep: 0,
      dificuldade: 5,
      intervalo: 0,
      fatorEase: 2.5,
      proximaRevisao: null,
      ultimaRevisao: null,
    });

    const responder = async (nota: string): Promise<void> => {
      await userEvent.click(await screen.findByRole("button", { name: /Ver resposta/ }));
      await userEvent.click(await screen.findByRole("button", { name: new RegExp(nota) }));
    };

    const emMinutos = (min: number): string => new Date(Date.now() + min * 60_000).toISOString();

    beforeEach(() => {
      vi.mocked(startDeckStudy).mockResolvedValue({
        sessionId: "s1",
        titulo: "Deck A",
        cards: [novoCard("c1", "Card um?"), novoCard("c2", "Card dois?")],
        totalNoDeck: 2,
      });
    });

    it("passa ao próximo card em vez de repetir o que acabou de ser adiado", async () => {
      vi.mocked(submitCardReview).mockResolvedValue({
        success: true,
        schedule: { fase: "LEARN", learningStep: 1, dificuldade: 3, intervalo: 0, fatorEase: 2.5, proximaRevisao: emMinutos(10), ultimaRevisao: emMinutos(0) },
      });

      render(<StudyDeckModal open onOpenChange={vi.fn()} baralhoId="b1" />);
      await responder("Bom");

      expect(await screen.findByText("Card dois?")).toBeInTheDocument();
      expect(screen.queryByText("Card um?")).not.toBeInTheDocument();
    });

    it("espera quando a fila acaba e o único card pendente ainda não venceu", async () => {
      vi.mocked(startDeckStudy).mockResolvedValue({
        sessionId: "s1",
        titulo: "Deck A",
        cards: [novoCard("c1", "Card um?")],
        totalNoDeck: 1,
      });
      vi.mocked(submitCardReview).mockResolvedValue({
        success: true,
        schedule: { fase: "LEARN", learningStep: 1, dificuldade: 3, intervalo: 0, fatorEase: 2.5, proximaRevisao: emMinutos(10), ultimaRevisao: emMinutos(0) },
      });

      render(<StudyDeckModal open onOpenChange={vi.fn()} baralhoId="b1" />);
      await responder("Bom");

      expect(await screen.findByText("Nada vencido agora")).toBeInTheDocument();
      expect(screen.queryByText("Card um?")).not.toBeInTheDocument();
    });

    // O card graduado (REVIEW, dias à frente) sai da sessão — nada de espera.
    it("encerra a sessão quando o card graduou, em vez de esperar dias", async () => {
      vi.mocked(startDeckStudy).mockResolvedValue({
        sessionId: "s1",
        titulo: "Deck A",
        cards: [novoCard("c1", "Card um?")],
        totalNoDeck: 1,
      });
      vi.mocked(submitCardReview).mockResolvedValue({
        success: true,
        schedule: { fase: "REVIEW", learningStep: 0, dificuldade: 1, intervalo: 4, fatorEase: 2.5, proximaRevisao: emMinutos(4 * 24 * 60), ultimaRevisao: emMinutos(0) },
      });

      render(<StudyDeckModal open onOpenChange={vi.fn()} baralhoId="b1" />);
      await responder("Fácil");

      expect(await screen.findByText("Sessão concluída!")).toBeInTheDocument();
    });
  });

  // O rótulo do botão saía de uma tabela fixa e mentia: dizia "~ 10 min" no
  // "Difícil", que num card novo agenda 1 min.
  it("mostra em cada botão o tempo que o algoritmo realmente agenda", async () => {
    vi.mocked(startDeckStudy).mockResolvedValue({
      sessionId: "s1",
      titulo: "Deck A",
      cards: [
        {
          id: "c1", pergunta: "Card um?", resposta: "R", conceito: null,
          fase: "LEARN", learningStep: 0, dificuldade: 5, intervalo: 0, fatorEase: 2.5,
          proximaRevisao: null, ultimaRevisao: null,
        },
      ],
      totalNoDeck: 1,
    });

    render(<StudyDeckModal open onOpenChange={vi.fn()} baralhoId="b1" />);
    await userEvent.click(await screen.findByRole("button", { name: /Ver resposta/ }));

    // O nome acessível concatena os dois spans do botão: "Errei" + "1 min".
    expect(await screen.findByRole("button", { name: /^Errei\s*1 min$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Difícil\s*1 min$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Bom\s*10 min$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Fácil\s*4 dias$/ })).toBeInTheDocument();
  });
});
