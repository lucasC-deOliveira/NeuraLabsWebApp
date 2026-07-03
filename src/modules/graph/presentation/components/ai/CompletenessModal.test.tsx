import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompletenessModal } from "./CompletenessModal";
import { assessCompleteness } from "@/lib/ai-api";

// O adapter delega para @/lib/ai-api, então mockar a borda cobre o fluxo.
vi.mock("@/lib/ai-api", () => ({ assessCompleteness: vi.fn(), fillKnowledgeGaps: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("CompletenessModal", () => {
  it("assesses completeness and lists the subjects", async () => {
    vi.mocked(assessCompleteness).mockResolvedValue({
      assessments: [{ assuntoId: "a1", assuntoNome: "Biologia", score: 6, wellCovered: [], shallow: [], missing: [] }],
    });
    render(<CompletenessModal open onOpenChange={vi.fn()} grafoId="g1" />);
    expect(assessCompleteness).toHaveBeenCalledWith("g1");
    expect(await screen.findByText("Biologia")).toBeInTheDocument();
  });

  it("shows the empty state when there are no subjects", async () => {
    vi.mocked(assessCompleteness).mockResolvedValue({ assessments: [] });
    render(<CompletenessModal open onOpenChange={vi.fn()} grafoId="g1" />);
    expect(await screen.findByText("Nenhum assunto encontrado no grafo.")).toBeInTheDocument();
  });
});
