import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ConquestCard } from "./ConquestCard";
import { getConquestSummary } from "@/lib/gamification-api";
import { graphsContaining } from "@/lib/graph-api";

vi.mock("@/lib/gamification-api", () => ({ getConquestSummary: vi.fn() }));
vi.mock("@/lib/graph-api", () => ({ graphsContaining: vi.fn() }));
vi.mock("@/lib/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(graphsContaining).mockResolvedValue([]);
});

describe("ConquestCard", () => {
  it("shows dominated over studied, with the closest concepts to finish", async () => {
    vi.mocked(getConquestSummary).mockResolvedValue({
      dominated: 3,
      inProgress: 7,
      studied: 10,
      quaseLa: [{ conceitoId: "c1", nome: "Grafos", score: 0.55, dominated: false }],
    });

    render(<ConquestCard />);

    expect(await screen.findByText(/de 10 conceitos dominados/)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Grafos")).toBeInTheDocument();
    expect(screen.getByText("55%")).toBeInTheDocument();
  });

  // Nada estudado ainda não deve deixar um card vazio no dashboard.
  it("renders nothing when nothing has been studied", async () => {
    vi.mocked(getConquestSummary).mockResolvedValue({
      dominated: 0,
      inProgress: 0,
      studied: 0,
      quaseLa: [],
    });
    const { container } = render(<ConquestCard />);

    await waitFor(() => expect(getConquestSummary).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
