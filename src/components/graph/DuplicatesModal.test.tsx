import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DuplicatesModal } from "./DuplicatesModal";
import { detectDuplicates } from "@/lib/ai-api";

vi.mock("@/lib/ai-api", () => ({ detectDuplicates: vi.fn(), mergeDuplicates: vi.fn() }));
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
});
