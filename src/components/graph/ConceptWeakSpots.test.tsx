import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ConceptWeakSpots } from "./ConceptWeakSpots";
import { diagnoseConceptErrors } from "@/lib/study-api";
import { graphsContaining } from "@/lib/graph-api";

vi.mock("@/lib/study-api", () => ({ diagnoseConceptErrors: vi.fn() }));
vi.mock("@/lib/graph-api", () => ({ graphsContaining: vi.fn() }));
vi.mock("@/lib/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const rank = (id: string, erros: number, revisoes: number) => ({
  conceitoId: id,
  nome: `Conceito ${id}`,
  revisoes,
  erros,
  taxaErro: erros / revisoes,
  score: 0.5,
  cardsComErro: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(graphsContaining).mockResolvedValue([{ grafoId: "g1", nome: "Redes" }]);
});

describe("ConceptWeakSpots", () => {
  it("shows the weak concepts, each with a way into the graph", async () => {
    vi.mocked(diagnoseConceptErrors).mockResolvedValue({
      conceitos: [rank("a", 8, 8), rank("b", 6, 10)],
      revisoesAnalisadas: 40,
    });
    render(<ConceptWeakSpots />);

    expect(await screen.findByText("Conceito a")).toBeInTheDocument();
    expect(screen.getByText("Conceito b")).toBeInTheDocument();
    // Cada linha oferece o "Ver no grafo" (via VerNoGrafo).
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /Ver no grafo/ }).length).toBe(2),
    );
  });

  // Nada a mostrar não deve deixar um bloco vazio no dashboard.
  it("renders nothing when there are no weak spots", async () => {
    vi.mocked(diagnoseConceptErrors).mockResolvedValue({ conceitos: [], revisoesAnalisadas: 0 });
    const { container } = render(<ConceptWeakSpots />);

    await waitFor(() => expect(diagnoseConceptErrors).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("stays silent when the diagnosis request fails", async () => {
    vi.mocked(diagnoseConceptErrors).mockRejectedValue(new Error("offline"));
    const { container } = render(<ConceptWeakSpots />);

    await waitFor(() => expect(diagnoseConceptErrors).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
