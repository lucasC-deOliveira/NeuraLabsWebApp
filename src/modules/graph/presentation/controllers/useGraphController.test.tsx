import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGraphController } from "./useGraphController";
import * as api from "@/lib/graph-api";

vi.mock("@/lib/graph-api");
vi.mock("@/lib/vault-bridge", () => ({ isDesktop: vi.fn(() => false), desktop: {} }));

beforeEach(() => {
  vi.mocked(api.getGraphNodes).mockResolvedValue({ nodes: [], edges: [] } as never);
  vi.mocked(api.getGraphEdges).mockResolvedValue([] as never);
  vi.mocked(api.getGrafoInfo).mockResolvedValue(null);
  vi.mocked(api.loadGraphVisualState).mockResolvedValue(null);
  // RAF no-op: evita o loop de animação "big bang" / física durante o teste.
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => vi.unstubAllGlobals());

describe("useGraphController", () => {
  it("exposes the state/actions/interactions shape and finishes loading", async () => {
    const { result } = renderHook(() => useGraphController("g1"));
    expect(result.current.state).toBeDefined();
    expect(result.current.actions).toBeDefined();
    expect(result.current.interactions).toBeDefined();
    await waitFor(() => expect(result.current.state.loading).toBe(false));
  });

  it("toggleNodeType hides then shows a node type", async () => {
    const { result } = renderHook(() => useGraphController("g1"));
    await waitFor(() => expect(result.current.state.loading).toBe(false));

    act(() => result.current.actions.toggleNodeType("CONCEITO"));
    expect(result.current.state.hiddenTypes.has("CONCEITO")).toBe(true);

    act(() => result.current.actions.toggleNodeType("CONCEITO"));
    expect(result.current.state.hiddenTypes.has("CONCEITO")).toBe(false);
  });

  it("setActiveTool and setPhysicsEnabled update the state", async () => {
    const { result } = renderHook(() => useGraphController("g1"));
    await waitFor(() => expect(result.current.state.loading).toBe(false));

    act(() => result.current.actions.setActiveTool("hand"));
    expect(result.current.state.activeTool).toBe("hand");

    act(() => result.current.actions.setPhysicsEnabled(false));
    expect(result.current.state.physicsEnabled).toBe(false);
  });
});
