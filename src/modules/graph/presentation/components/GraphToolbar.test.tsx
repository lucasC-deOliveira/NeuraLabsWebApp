import { describe, it, expect, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GraphToolbar } from "./GraphToolbar";

function setup(overrides: Record<string, unknown> = {}) {
  const handlers = {
    onToggleLegend: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onTogglePhysics: vi.fn(),
    onToggleHighContrast: vi.fn(),
    onToggleHeatmap: vi.fn(),
    onToggleFocus: vi.fn(),
    onToggleShowClusters: vi.fn(),
    onOpenSettings: vi.fn(),
    onToggle3D: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
  };
  const props = {
    legendVisible: true,
    physicsEnabled: false,
    highContrast: false,
    heatmap: false,
    focusMode: false,
    showClusters: false,
    is3D: false,
    canUndo: false,
    canRedo: false,
    ...handlers,
    ...overrides,
  };
  render(<GraphToolbar {...(props as ComponentProps<typeof GraphToolbar>)} />);
  return handlers;
}

describe("GraphToolbar", () => {
  it("wires each icon button (in JSX order) to its handler", async () => {
    const h = setup({ canUndo: true, canRedo: true });
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(12);

    // ordem: undo, redo, zoomIn, zoomOut, physics, contrast, heatmap, focus, clusters, legend, 3D, settings
    const expected = [
      h.onUndo,
      h.onRedo,
      h.onZoomIn,
      h.onZoomOut,
      h.onTogglePhysics,
      h.onToggleHighContrast,
      h.onToggleHeatmap,
      h.onToggleFocus,
      h.onToggleShowClusters,
      h.onToggleLegend,
      h.onToggle3D,
      h.onOpenSettings,
    ];
    for (let i = 0; i < expected.length; i++) {
      await userEvent.click(buttons[i]);
      expect(expected[i], `button #${i}`).toHaveBeenCalledTimes(1);
    }
  });

  it("renders the active/3D variants without crashing", () => {
    expect(() =>
      setup({ physicsEnabled: true, highContrast: true, focusMode: true, showClusters: true, is3D: true, legendVisible: false }),
    ).not.toThrow();
  });
});
