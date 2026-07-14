import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImproveQuestaoModal } from "./ImproveQuestaoModal";
import { graphHttp } from "@/modules/graph/infra/http";

vi.mock("@/modules/graph/infra/http", () => ({
  graphHttp: { getQuestao: vi.fn(), improveQuestao: vi.fn(), updateQuestao: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const original = {
  id: "q1",
  tipo: "MULTIPLA_ESCOLHA",
  enunciado: "qual e a capital",
  alternativas: [
    { letra: "A", texto: "sao paulo" },
    { letra: "B", texto: "brasilia" },
  ],
  gabarito: "B",
  explicacao: "brasilia",
  conceitoNome: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(graphHttp.getQuestao).mockResolvedValue(original as never);
  vi.mocked(graphHttp.improveQuestao).mockResolvedValue({
    enunciado: "Qual é a capital?",
    alternativas: [
      { letra: "A", texto: "São Paulo" },
      { letra: "B", texto: "Brasília" },
    ],
    explicacao: "Brasília é a capital.",
  });
  vi.mocked(graphHttp.updateQuestao).mockResolvedValue({ success: true });
});

describe("ImproveQuestaoModal", () => {
  it("improves the question, previews it, and applies (preserving the answer key)", async () => {
    const onApplied = vi.fn();
    render(<ImproveQuestaoModal open onOpenChange={vi.fn()} questaoId="q1" onApplied={onApplied} />);
    expect(await screen.findByText("Estilo Markdown")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Melhorar com IA/ }));

    expect(graphHttp.improveQuestao).toHaveBeenCalledWith({
      tipo: "MULTIPLA_ESCOLHA",
      enunciado: "qual e a capital",
      alternativas: original.alternativas,
      gabarito: "B",
      explicacao: "brasilia",
      operations: ["format", "markdown"],
    });
    expect(await screen.findByText("Qual é a capital?")).toBeInTheDocument(); // prévia melhorada

    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(graphHttp.updateQuestao).toHaveBeenCalledWith("q1", {
      enunciado: "Qual é a capital?",
      alternativas: [
        { letra: "A", texto: "São Paulo" },
        { letra: "B", texto: "Brasília" },
      ],
      explicacao: "Brasília é a capital.",
    });
    expect(onApplied).toHaveBeenCalled();
  });
});
