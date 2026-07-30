import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanSetup } from "./PlanSetup";
import { saveStudyPlan, getPlanScope, buildRoadmap } from "@/lib/study-plan-api";

vi.mock("@/lib/study-plan-api", () => ({
  saveStudyPlan: vi.fn((input) => Promise.resolve({ id: "p1", ativo: true, ...input })),
  getGraphRoadmaps: vi.fn(() => Promise.resolve([])), // nenhum roadmap ainda → gera ao salvar
  getPlanScope: vi.fn(() => Promise.resolve({ hasProva: false, hasEdital: false })),
  buildRoadmap: vi.fn(() => Promise.resolve({ itens: [] })),
}));
vi.mock("@/lib/baralhos-api", () => ({ getBaralhos: vi.fn(() => Promise.resolve([])) }));
vi.mock("@/lib/provas-api", () => ({ listProvas: vi.fn(() => Promise.resolve([])) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const graphs = [
  { id: "g1", nome: "Cálculo" },
  { id: "g2", nome: "Física" },
];

const btn = (name: RegExp | string) => screen.getByRole("button", { name });

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks zera as chamadas, não a implementação — repõe o default do escopo.
  vi.mocked(getPlanScope).mockResolvedValue({ hasProva: false, hasEdital: false });
});

describe("PlanSetup (assistente guiado)", () => {
  it("flui objetivo → conteúdo → ritmo e salva 'dominar assunto' com prioridade IA", async () => {
    const onSaved = vi.fn();
    render(<PlanSetup graphs={graphs} initial={null} onSaved={onSaved} onCancel={vi.fn()} />);

    await userEvent.click(btn(/Dominar um assunto/));
    await userEvent.click(btn(/Próximo/));
    await userEvent.click(btn("Cálculo"));
    await userEvent.click(btn("Física"));
    await userEvent.click(btn(/Próximo/));
    await userEvent.click(btn(/Criar plano/));

    await waitFor(() => expect(saveStudyPlan).toHaveBeenCalled());
    expect(buildRoadmap).toHaveBeenCalledWith("g1", "ai");
    expect(buildRoadmap).toHaveBeenCalledWith("g2", "ai");
    const input = vi.mocked(saveStudyPlan).mock.calls[0][0];
    expect(input.grafoIds).toEqual(["g1", "g2"]);
    expect(input.prioridade).toBe("ai");
    expect(onSaved).toHaveBeenCalled();
  });

  it("objetivo prova + grafo com prova → salva na ordem 'o que mais cai na prova'", async () => {
    vi.mocked(getPlanScope).mockResolvedValue({ hasProva: true, hasEdital: false });
    render(<PlanSetup graphs={graphs} initial={null} onSaved={vi.fn()} />);

    await userEvent.click(btn(/Passar numa prova/));
    await userEvent.click(btn(/Próximo/));
    await userEvent.click(btn("Cálculo"));
    await waitFor(() => expect(getPlanScope).toHaveBeenCalledWith(["g1"]));
    await userEvent.click(btn(/Próximo/));
    await userEvent.click(btn(/Criar plano/));

    await waitFor(() => expect(saveStudyPlan).toHaveBeenCalled());
    expect(buildRoadmap).toHaveBeenCalledWith("g1", "prova");
    expect(vi.mocked(saveStudyPlan).mock.calls[0][0].prioridade).toBe("prova");
  });

  it("objetivo prova sem prova no grafo → bloqueia salvar", async () => {
    render(<PlanSetup graphs={graphs} initial={null} onSaved={vi.fn()} />);
    await userEvent.click(btn(/Passar numa prova/));
    await userEvent.click(btn(/Próximo/));
    await userEvent.click(btn("Cálculo"));
    await userEvent.click(btn(/Próximo/));
    await userEvent.click(btn(/Criar plano/));
    expect(saveStudyPlan).not.toHaveBeenCalled();
  });

  it("não avança do conteúdo sem escolher nada", async () => {
    render(<PlanSetup graphs={graphs} initial={null} onSaved={vi.fn()} />);
    await userEvent.click(btn(/Dominar um assunto/));
    await userEvent.click(btn(/Próximo/));
    expect(btn(/Próximo/)).toBeDisabled();
  });
});
