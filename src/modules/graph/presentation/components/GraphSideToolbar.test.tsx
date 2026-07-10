import { describe, it, expect, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { useGraphSearch } from "../hooks/useGraphSearch";
import { GraphSideToolbar } from "./GraphSideToolbar";

// Usa o hook real p/ produzir um GraphSearch válido (em vez de fakear o tipo inteiro).
type ToolbarProps = Omit<ComponentProps<typeof GraphSideToolbar>, "search">;

function Harness(props: ToolbarProps) {
  const search = useGraphSearch([], []);
  return <GraphSideToolbar search={search} {...props} />;
}

function setup(overrides: Record<string, unknown> = {}) {
  const handlers = {
    onToolChange: vi.fn(),
    onOpenCreateNode: vi.fn(),
    onOpenEdgeManager: vi.fn(),
    onOpenImportJson: vi.fn(),
    onDeleteGraph: vi.fn(),
    onFocusNode: vi.fn(),
    onToggleType: vi.fn(),
    onToggleRelation: vi.fn(),
    onToggleRoadmap: vi.fn(),
  };
  const props = {
    isDark: false,
    tool: "select",
    nodeStats: {},
    hiddenTypes: new Set<string>(),
    relationStats: {},
    hiddenRelations: new Set<string>(),
    roadmapOpen: false,
    ...handlers,
    ...overrides,
  };
  render(<Harness {...(props as ToolbarProps)} />);
  return handlers;
}

describe("GraphSideToolbar", () => {
  it("renders the icon rail without crashing", () => {
    setup();
    // o rail lateral é só ícones por padrão; o painel de busca/filtros é colapsável.
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });

  it("renders without the optional delete-graph action when the handler is absent", () => {
    const withDelete = (() => {
      setup();
      return screen.getAllByRole("button").length;
    })();
    cleanup();
    setup({ onDeleteGraph: undefined });
    const withoutDelete = screen.getAllByRole("button").length;
    expect(withoutDelete).toBeLessThan(withDelete);
  });
});
