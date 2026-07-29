import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanSetup } from "./PlanSetup";
import { saveStudyPlan, getGraphRoadmaps, buildRoadmap } from "@/lib/study-plan-api";

vi.mock("@/lib/study-plan-api", () => ({
  saveStudyPlan: vi.fn((input) => Promise.resolve({ id: "p1", ativo: true, ...input })),
  getGraphRoadmaps: vi.fn(() => Promise.resolve([])), // nenhum roadmap ainda → gera ao salvar
  buildRoadmap: vi.fn(() => Promise.resolve({ itens: [] })),
}));
vi.mock("@/lib/baralhos-api", () => ({ getBaralhos: vi.fn(() => Promise.resolve([])) }));
vi.mock("@/lib/provas-api", () => ({ listProvas: vi.fn(() => Promise.resolve([])) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const graphs = [
  { id: "g1", nome: "Cálculo" },
  { id: "g2", nome: "Física" },
];

beforeEach(() => vi.clearAllMocks());

describe("PlanSetup", () => {
  it("saves graphs as content and generates the roadmap for each chosen graph", async () => {
    const onSaved = vi.fn();
    render(<PlanSetup graphs={graphs} initial={null} onSaved={onSaved} onCancel={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Cálculo" }));
    await userEvent.click(screen.getByRole("button", { name: "Física" }));
    await userEvent.click(screen.getByRole("button", { name: /Criar plano/ }));

    await waitFor(() => expect(saveStudyPlan).toHaveBeenCalled());
    // Roadmap gerado para cada grafo do conteúdo (prioridade padrão "ai", sem provas).
    expect(buildRoadmap).toHaveBeenCalledWith("g1", "ai");
    expect(buildRoadmap).toHaveBeenCalledWith("g2", "ai");
    const input = vi.mocked(saveStudyPlan).mock.calls[0][0];
    expect(input.grafoIds).toEqual(["g1", "g2"]);
    expect(input.prioridade).toBe("ai");
    expect(onSaved).toHaveBeenCalled();
  });

  it("refuses to save when no content is selected", async () => {
    render(<PlanSetup graphs={graphs} initial={null} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Criar plano/ }));
    expect(saveStudyPlan).not.toHaveBeenCalled();
  });

  it("hides the priority selector until a graph is in the content", async () => {
    render(<PlanSetup graphs={graphs} initial={null} onSaved={vi.fn()} />);
    // Sem grafos, prioridade (ordem dos grafos) não aparece.
    expect(screen.queryByText(/a ordem de estudo dos grafos/i)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Cálculo" }));
    await waitFor(() => expect(getGraphRoadmaps).toHaveBeenCalledWith("g1"));
    expect(screen.getByText(/a ordem de estudo dos grafos/i)).toBeInTheDocument();
  });
});
