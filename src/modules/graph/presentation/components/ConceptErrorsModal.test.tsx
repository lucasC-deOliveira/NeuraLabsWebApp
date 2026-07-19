import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConceptErrorsModal } from "./ConceptErrorsModal";
import { diagnoseConceptErrors } from "@/lib/study-api";

vi.mock("@/lib/study-api", () => ({ diagnoseConceptErrors: vi.fn() }));

const rank = {
  conceitoId: "c1",
  nome: "Binary Search",
  revisoes: 8,
  erros: 6,
  taxaErro: 0.75,
  score: 0.4,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(diagnoseConceptErrors).mockResolvedValue({
    conceitos: [rank],
    revisoesAnalisadas: 40,
  });
});

describe("ConceptErrorsModal", () => {
  it("shows the concept with the evidence behind the percentage", async () => {
    render(<ConceptErrorsModal open onOpenChange={vi.fn()} />);

    expect(await screen.findByText("Binary Search")).toBeInTheDocument();
    expect(screen.getByText("6/8 erros")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("lets the user jump from a problem concept to the graph", async () => {
    const onFocusConcept = vi.fn();
    render(<ConceptErrorsModal open onOpenChange={vi.fn()} onFocusConcept={onFocusConcept} />);

    await userEvent.click(await screen.findByText("Binary Search"));

    expect(onFocusConcept).toHaveBeenCalledWith("c1", "Binary Search");
  });

  // "Acerta tudo" e "não estudou" não podem parecer a mesma tela.
  it("tells an empty history apart from a clean one", async () => {
    vi.mocked(diagnoseConceptErrors).mockResolvedValue({ conceitos: [], revisoesAnalisadas: 0 });
    render(<ConceptErrorsModal open onOpenChange={vi.fn()} />);

    expect(await screen.findByText(/Ainda não há revisões suficientes/)).toBeInTheDocument();
  });

  it("celebrates a clean diagnosis when there was history to look at", async () => {
    vi.mocked(diagnoseConceptErrors).mockResolvedValue({ conceitos: [], revisoesAnalisadas: 40 });
    render(<ConceptErrorsModal open onOpenChange={vi.fn()} />);

    expect(await screen.findByText(/Nenhum conceito problemático/)).toBeInTheDocument();
  });

  it("shows an error state when the diagnosis fails", async () => {
    vi.mocked(diagnoseConceptErrors).mockRejectedValue(new Error("falhou"));
    render(<ConceptErrorsModal open onOpenChange={vi.fn()} />);

    expect(await screen.findByText("falhou")).toBeInTheDocument();
  });
});
