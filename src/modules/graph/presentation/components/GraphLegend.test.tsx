import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GraphLegend } from "./GraphLegend";
import { NODE_TYPE_DISPLAY } from "@/modules/graph/constants/graph-ui.constants";

// Presentational component (no api, no 3D): the real graph-style.service runs.
function isBefore(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("GraphLegend", () => {
  it("renders the Nós and Relações sections in order", () => {
    render(<GraphLegend isDark={false} />);
    const nos = screen.getByText("Nós:");
    const relacoes = screen.getByText("Relações:");
    expect(isBefore(nos, relacoes)).toBe(true);
  });

  it("shows a label for every node type", () => {
    render(<GraphLegend isDark={false} />);
    for (const { label } of Object.values(NODE_TYPE_DISPLAY)) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders in the high-contrast variant without crashing", () => {
    expect(() => render(<GraphLegend isDark highContrast />)).not.toThrow();
  });
});
