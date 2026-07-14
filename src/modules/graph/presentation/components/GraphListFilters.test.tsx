import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GraphListFilters } from "./GraphListFilters";
import type { GraphListParams } from "../../domain/types/graph.types";

const base: GraphListParams = { page: 1, pageSize: 12 };

describe("GraphListFilters", () => {
  it("hides the reset button when no filter is active", () => {
    render(<GraphListFilters params={base} assuntos={[]} onFilter={vi.fn()} />);
    expect(screen.queryByText("Limpar filtros")).not.toBeInTheDocument();
  });

  it("shows the reset button and clears every filter when clicked", () => {
    const onFilter = vi.fn();
    render(
      <GraphListFilters params={{ ...base, tipo: "raiz" }} assuntos={[]} onFilter={onFilter} />,
    );
    fireEvent.click(screen.getByText("Limpar filtros"));
    expect(onFilter).toHaveBeenCalledWith({
      q: undefined,
      tipo: "todos",
      sort: "recentes",
      createdFrom: undefined,
      assuntoIds: undefined,
    });
  });
});
