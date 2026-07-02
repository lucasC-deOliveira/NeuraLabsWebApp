import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GraphDashboard } from "./GraphDashboard";

// recharts precisa de dimensões reais (ausentes no jsdom) — substituído por
// passthroughs nulos; os KPIs (DOM, via computeGraphMetrics real) continuam.
vi.mock("recharts", () => {
  const Noop = (): null => null;
  return {
    PieChart: Noop, Pie: Noop, Cell: Noop, Tooltip: Noop, Legend: Noop,
    ResponsiveContainer: Noop, BarChart: Noop, Bar: Noop, XAxis: Noop, YAxis: Noop,
    CartesianGrid: Noop, RadarChart: Noop, PolarGrid: Noop, PolarAngleAxis: Noop,
    Radar: Noop, ScatterChart: Noop, Scatter: Noop, ZAxis: Noop,
  };
});

const nodes = [
  { id: "n1", label: "A", group: "CONCEITO", dominio: 0, x: 0, y: 0, prioridadeRevisao: 0, tipoReal: "CONCEITO" },
  { id: "n2", label: "B", group: "CONCEITO", dominio: 0, x: 0, y: 0, prioridadeRevisao: 0, tipoReal: "CONCEITO" },
] as never;

describe("GraphDashboard", () => {
  it("renders the KPI cards computed from the graph metrics", () => {
    render(<GraphDashboard open onClose={vi.fn()} nodes={nodes} edges={[] as never} onFilteredIdsChange={vi.fn()} />);
    expect(screen.getByText("Nós")).toBeInTheDocument();
    expect(screen.getByText("Relações")).toBeInTheDocument();
    expect(screen.getByText("Saúde")).toBeInTheDocument();
  });
});
