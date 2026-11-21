import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useGraphData } from "./useGraphData";
import * as api from "@/lib/graph-api";
import { desktop, isDesktop } from "@/lib/vault-bridge";

vi.mock("@/lib/graph-api");
vi.mock("@/lib/vault-bridge", () => ({
  isDesktop: vi.fn(() => false),
  desktop: { vault: { getPath: vi.fn(), listGraphFolders: vi.fn(), readFile: vi.fn(), read: vi.fn() } },
}));

beforeEach(() => {
  localStorage.clear(); // isola o cache stale-while-revalidate entre os testes
  vi.clearAllMocks();
  vi.mocked(isDesktop).mockReturnValue(false);
  vi.mocked(api.getGraphNodes).mockResolvedValue({
    nodes: [{ id: "n1" }],
    edges: [{ source: "a", target: "b" }],
  } as never);
  vi.mocked(api.getGraphEdges).mockResolvedValue([{ id: "e1" }] as never);
  vi.mocked(api.getGrafoInfo).mockResolvedValue({ nome: "Bio" } as never);
  vi.mocked(api.loadGraphVisualState).mockResolvedValue({ zoom: 2, pan: { x: 5, y: 6 } } as never);
});

describe("useGraphData", () => {
  it("opens a downloaded desktop graph without login, cache, or server reads", async () => {
    vi.mocked(isDesktop).mockReturnValue(true);
    vi.mocked(desktop.vault.getPath).mockResolvedValue("/vault");
    vi.mocked(desktop.vault.listGraphFolders).mockResolvedValue([
      { id: "g1", directory: "/vault/graph--g1", label: "graph", modifiedAt: "2026-01-01T00:00:00Z" },
    ]);
    vi.mocked(desktop.vault.readFile).mockResolvedValue(null);
    vi.mocked(desktop.vault.read).mockResolvedValue([
      { relPath: "Resources/node.md", content: "---\nid: local\ntipo: CONCEITO\ntitulo: Local\n---\n" },
    ]);

    const { result } = renderHook(() => useGraphData("g1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rawNodes).toEqual([expect.objectContaining({ id: "local", label: "Local" })]);
    expect(api.getGraphNodes).not.toHaveBeenCalled();
    expect(api.getGraphEdges).not.toHaveBeenCalled();
    expect(api.loadGraphVisualState).not.toHaveBeenCalled();
  });
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
