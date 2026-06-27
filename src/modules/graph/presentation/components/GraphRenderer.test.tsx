import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { GraphRenderer } from "./GraphRenderer";

// Renderer canvas-2D: o jsdom não implementa o contexto 2D, então o stubbamos.
vi.mock("@/components/color-theme-provider", () => ({ useColorTheme: () => ({ colorTheme: "default" }) }));

let getContextSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  const fakeCtx = new Proxy({}, { get: () => () => ({ width: 0 }), set: () => true });
  getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue(fakeCtx as unknown as CanvasRenderingContext2D);
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => {
  getContextSpy.mockRestore();
  vi.unstubAllGlobals();
});

const props = {
  nodes: [],
  edges: [],
  zoom: 0.6,
  pan: { x: 0, y: 0 },
  isDark: false,
  svgRef: { current: null },
  tool: "select" as const,
  selectedNodeIds: new Set<string>(),
  marquee: null,
  onNodeClick: vi.fn(),
  onNodeDragStart: vi.fn(),
  onPanStart: vi.fn(),
  onMarqueeStart: vi.fn(),
  onWheel: vi.fn(),
  onNodeHover: vi.fn(),
};

describe("GraphRenderer (smoke)", () => {
  it("mounts a canvas without crashing", () => {
    const { container } = render(<GraphRenderer {...props} />);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("publishes the canvas element onto the provided svgRef", () => {
    const svgRef = { current: null as HTMLCanvasElement | null };
    render(<GraphRenderer {...props} svgRef={svgRef} />);
    expect(svgRef.current).toBeInstanceOf(HTMLCanvasElement);
  });
});
