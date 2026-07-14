import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useGraphAssuntos } from "./useGraphAssuntos";
import { graphHttp } from "../../infra/http";

vi.mock("../../infra/http", () => ({ graphHttp: { listGraphAssuntos: vi.fn() } }));

beforeEach(() => vi.mocked(graphHttp.listGraphAssuntos).mockReset());

describe("useGraphAssuntos", () => {
  it("loads the available assuntos on mount", async () => {
    vi.mocked(graphHttp.listGraphAssuntos).mockResolvedValue([{ id: "a1", nome: "Direito" }]);
    const { result } = renderHook(() => useGraphAssuntos());
    await waitFor(() => expect(result.current).toEqual([{ id: "a1", nome: "Direito" }]));
  });

  it("stays empty when there are no assuntos", async () => {
    vi.mocked(graphHttp.listGraphAssuntos).mockResolvedValue([]);
    const { result } = renderHook(() => useGraphAssuntos());
    await waitFor(() => expect(graphHttp.listGraphAssuntos).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });
});
