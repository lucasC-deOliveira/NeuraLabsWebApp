import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RoadmapPanel } from "./RoadmapPanel";
import { buildRoadmap } from "@/lib/ai-api";

vi.mock("@/lib/ai-api", () => ({
  buildRoadmap: vi.fn(() =>
    Promise.resolve({
      itens: [{ nodeId: "n1", nome: "Mitose", tipo: "CONCEITO", motivo: "Caiu em 3 questão(ões)", provaFreq: 3 }],
      dataGeracao: new Date().toISOString(),
      novos: 1,
    }),
  ),
}));

const baseProps = {
  grafoId: "g1",
  nodes: [
    { id: "n1", label: "Mitose", group: "CONCEITO", dominio: 0 },
    { id: "n2", label: "Meiose", group: "CONCEITO", dominio: 1 },
  ],
  edges: [{ source: "n1", target: "n2", type: "PREREQUISITO" }],
  provas: [],
  editais: [],
  onFocusNode: vi.fn(),
};

describe("RoadmapPanel", () => {
  beforeEach(() => vi.mocked(buildRoadmap).mockClear());

  it("renders nothing when closed", () => {
    render(<RoadmapPanel open={false} onClose={vi.fn()} {...baseProps} />);
    expect(screen.queryByText("Roadmap de estudo")).toBeNull();
  });

  it("renders the header and the mode selector with the priority modes", () => {
    render(<RoadmapPanel open onClose={vi.fn()} {...baseProps} />);
    expect(screen.getByText("Roadmap de estudo")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Prioridade IA" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Por edital" })).toBeInTheDocument();
  });

  it("calls onClose from the header close button", () => {
    const onClose = vi.fn();
    render(<RoadmapPanel open onClose={onClose} {...baseProps} />);
    const header = screen.getByText("Roadmap de estudo").parentElement?.parentElement as HTMLElement;
    fireEvent.click(header.querySelector("button") as HTMLButtonElement);
    expect(onClose).toHaveBeenCalled();
  });

  it("fetches the server roadmap and shows steps and the 'new items' banner when switching mode", async () => {
    render(<RoadmapPanel open onClose={vi.fn()} {...baseProps} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "prova" } });
    expect(await screen.findByText("Mitose")).toBeInTheDocument();
    expect(screen.getByText(/novo priorizado/)).toBeInTheDocument();
    expect(buildRoadmap).toHaveBeenCalledWith("g1", "prova", {
      regenerate: false,
      provaId: undefined,
      editalId: undefined,
    });
  });

  it("regenerates with regenerate=true", async () => {
    render(<RoadmapPanel open onClose={vi.fn()} {...baseProps} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "edital" } });
    fireEvent.click(await screen.findByText("Regerar"));
    expect(buildRoadmap).toHaveBeenCalledWith("g1", "edital", {
      regenerate: true,
      provaId: undefined,
      editalId: undefined,
    });
  });

  it("shows an edital selector for edital modes when the graph has several editais", async () => {
    const editais = [{ id: "ed1", label: "SERPRO" }, { id: "ed2", label: "INSS" }];
    render(<RoadmapPanel open onClose={vi.fn()} {...baseProps} editais={editais} />);
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "edital" } });
    const selects = await screen.findAllByRole("combobox");
    expect(selects).toHaveLength(2);
    fireEvent.change(selects[1], { target: { value: "ed2" } });
    await waitFor(() =>
      expect(buildRoadmap).toHaveBeenLastCalledWith("g1", "edital", {
        regenerate: false,
        provaId: undefined,
        editalId: "ed2",
      }),
    );
  });

  it("shows a prova selector for prova modes when the graph has several provas", async () => {
    const provas = [{ id: "p1", label: "ENEM" }, { id: "p2", label: "CEBRASPE" }];
    render(<RoadmapPanel open onClose={vi.fn()} {...baseProps} provas={provas} />);
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "prova" } });
    const selects = await screen.findAllByRole("combobox");
    expect(selects).toHaveLength(2);
    fireEvent.change(selects[1], { target: { value: "p2" } });
    await waitFor(() =>
      expect(buildRoadmap).toHaveBeenLastCalledWith("g1", "prova", {
        regenerate: false,
        provaId: "p2",
        editalId: undefined,
      }),
    );
  });
});
