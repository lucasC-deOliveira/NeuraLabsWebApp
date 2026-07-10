import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DuplicatesModal } from "./DuplicatesModal";
import { detectDuplicates, detectDuplicatesBySimilarity } from "@/lib/ai-api";

// O adapter delega para @/lib/*, então mockar a borda cobre o fluxo.
vi.mock("@/lib/ai-api", () => ({
  detectDuplicates: vi.fn(),
  detectDuplicatesBySimilarity: vi.fn(),
  mergeDuplicates: vi.fn(),
}));
vi.mock("@/lib/graph-api", () => ({ deleteGraphNode: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const group = {
  sugestao: "Parecem o mesmo conceito",
  nodes: [
    { id: "a", nome: "Mitose", tipo: "CONCEITO" },
    { id: "b", nome: "Mitóse", tipo: "CONCEITO" },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe("DuplicatesModal", () => {
  it("detects duplicate groups and lists them", async () => {
    vi.mocked(detectDuplicates).mockResolvedValue({ groups: [group] });
    render(<DuplicatesModal open onOpenChange={vi.fn()} grafoId="g1" onDeleted={vi.fn()} />);

    expect(detectDuplicates).toHaveBeenCalledWith("g1");
    expect(await screen.findByText(/1 grupo/)).toBeInTheDocument();
    expect(screen.getByText("Mitóse")).toBeInTheDocument();
  });

  it("shows the no-duplicates state when none are found", async () => {
    vi.mocked(detectDuplicates).mockResolvedValue({ groups: [] });
    render(<DuplicatesModal open onOpenChange={vi.fn()} grafoId="g1" onDeleted={vi.fn()} />);
    expect(await screen.findByText("Nenhuma duplicata encontrada!")).toBeInTheDocument();
  });

  it("shows a retry on analysis error", async () => {
    vi.mocked(detectDuplicates).mockRejectedValue(new Error("boom"));
    render(<DuplicatesModal open onOpenChange={vi.fn()} grafoId="g1" onDeleted={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("switches to the similarity detector when the toggle is used", async () => {
    vi.mocked(detectDuplicates).mockResolvedValue({ groups: [] });
    vi.mocked(detectDuplicatesBySimilarity).mockResolvedValue({ groups: [group] });
    render(<DuplicatesModal open onOpenChange={vi.fn()} grafoId="g1" onDeleted={vi.fn()} />);
    await screen.findByText("Nenhuma duplicata encontrada!"); // LLM run finished

    await userEvent.click(screen.getByRole("button", { name: "Similaridade" }));

    expect(detectDuplicatesBySimilarity).toHaveBeenCalledWith("g1", undefined);
    expect(await screen.findByText("Mitóse")).toBeInTheDocument();
  });
});
