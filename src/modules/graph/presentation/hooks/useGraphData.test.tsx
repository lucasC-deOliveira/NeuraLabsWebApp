import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useGraphData } from "./useGraphData";
import * as api from "@/lib/graph-api";

// Web path only (isDesktop=false) — o overlay do vault (desktop) é coberto à parte.
vi.mock("@/lib/graph-api");
vi.mock("@/lib/vault-bridge", () => ({ isDesktop: vi.fn(() => false), desktop: {} }));

beforeEach(() => {
  localStorage.clear(); // isola o cache stale-while-revalidate entre os testes
  vi.mocked(api.getGraphNodes).mockResolvedValue({
    nodes: [{ id: "n1" }],
    edges: [{ source: "a", target: "b" }],
  } as never);
  vi.mocked(api.getGraphEdges).mockResolvedValue([{ id: "e1" }] as never);
  vi.mocked(api.getGrafoInfo).mockResolvedValue({ nome: "Bio" } as never);
  vi.mocked(api.loadGraphVisualState).mockResolvedValue({ zoom: 2, pan: { x: 5, y: 6 } } as never);
});

describe("useGraphData", () => {
  it("loads nodes/edges/name/visual-state from the backend", async () => {
    const { result } = renderHook(() => useGraphData("g1"));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.getGraphNodes).toHaveBeenCalledWith("g1");
    expect(result.current.rawNodes).toEqual([{ id: "n1" }]);
    expect(result.current.rawEdges).toEqual([{ source: "a", target: "b" }]);
    expect(result.current.grafoNome).toBe("Bio");
    expect(result.current.zoom).toBe(2);
    expect(result.current.pan).toEqual({ x: 5, y: 6 });
    await waitFor(() => expect(result.current.graphEdges).toEqual([{ id: "e1" }]));
  });

  it("keeps the default name when the graph info has none", async () => {
    vi.mocked(api.getGrafoInfo).mockResolvedValue(null);
    const { result } = renderHook(() => useGraphData("g1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.grafoNome).toBe("Mapa de Conhecimento");
  });

  it("opens instantly from cache, then revalidates in the background", async () => {
    // primeira montagem carrega e popula o cache do grafo...
    const first = renderHook(() => useGraphData("g1"));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    // ...uma nova montagem mostra o cache SEM spinner (loading já false no 1º render).
    const second = renderHook(() => useGraphData("g1"));
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.rawNodes).toEqual([{ id: "n1" }]);
  });
});
