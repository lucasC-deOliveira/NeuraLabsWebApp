import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useGraphLayout } from "./useGraphLayout";
import { runForceLayout } from "@/modules/graph/infra/layout/force-layout.engine";

vi.mock("@/modules/graph/infra/layout/force-layout.engine", () => ({
  runForceLayout: vi.fn(() => ({
    nodes: [{ id: "n1", x: 1, y: 2 }],
    edges: [{ source: "n1", target: "n2" }],
  })),
}));

const node = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  label: id,
  type: "CONCEITO",
  nivelDominio: 0,
  prioridadeRevisao: 5,
  ...extra,
});

describe("useGraphLayout", () => {
  beforeEach(() => vi.mocked(runForceLayout).mockClear());

  it("runs the force layout for a small graph and exposes its result", async () => {
    const { result } = renderHook(() => useGraphLayout([node("n1")] as never, [] as never));
    await waitFor(() => expect(result.current.nodes).toHaveLength(1));
    expect(runForceLayout).toHaveBeenCalled();
    expect(result.current.nodes[0]).toMatchObject({ id: "n1", x: 1, y: 2 });
  });

  it("stays empty (and skips layout) when there are no nodes", () => {
    const { result } = renderHook(() => useGraphLayout([] as never, [] as never));
    expect(result.current.nodes).toEqual([]);
    expect(runForceLayout).not.toHaveBeenCalled();
  });

  it("uses the saved positions (ref path) for a large pinned graph, without force layout", async () => {
    const big = Array.from({ length: 401 }, (_, i) => node(`n${i}`, { posicaoX: i, posicaoY: i }));
    const { result } = renderHook(() => useGraphLayout(big as never, [] as never));
    await waitFor(() => expect(result.current.nodes.length).toBe(401));
    expect(runForceLayout).not.toHaveBeenCalled();
    expect(result.current.nodes[0]).toMatchObject({ pinned: true });
  });
});
