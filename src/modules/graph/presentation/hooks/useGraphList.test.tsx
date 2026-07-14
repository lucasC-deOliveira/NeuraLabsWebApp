import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGraphList } from "./useGraphList";
import { saveCachedGraphList } from "../services/graph-list-cache";
import { graphHttp } from "../../infra/http";

vi.mock("../../infra/http", () => ({ graphHttp: { listUserGraphs: vi.fn() } }));

const page = (over: Record<string, unknown> = {}) => ({
  items: [{ id: "g1", nome: "Bio" }],
  total: 1,
  page: 1,
  pageSize: 12,
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  vi.mocked(graphHttp.listUserGraphs).mockReset();
  vi.mocked(graphHttp.listUserGraphs).mockResolvedValue(page() as never);
});

describe("useGraphList", () => {
  it("fetches the first page with defaults on mount", async () => {
    const { result } = renderHook(() => useGraphList());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(graphHttp.listUserGraphs).toHaveBeenCalledWith({ page: 1, pageSize: 12 });
    expect(result.current.result.items).toEqual([{ id: "g1", nome: "Bio" }]);
  });

  it("resets to page 1 when a filter changes", async () => {
    const { result } = renderHook(() => useGraphList());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setPage(4));
    await waitFor(() => expect(result.current.params.page).toBe(4));
    act(() => result.current.setFilter({ q: "direito" }));
    await waitFor(() => expect(result.current.params).toMatchObject({ q: "direito", page: 1 }));
  });

  it("re-fetches on reload without changing the params", async () => {
    const { result } = renderHook(() => useGraphList());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.reload());
    await waitFor(() => expect(graphHttp.listUserGraphs).toHaveBeenCalledTimes(2));
  });

  it("shows the cached page instantly, then revalidates in the background", async () => {
    saveCachedGraphList({ page: 1, pageSize: 12 }, page({ items: [{ id: "cached", nome: "Cached" }] }));
    vi.mocked(graphHttp.listUserGraphs).mockResolvedValue(
      page({ items: [{ id: "fresh", nome: "Fresh" }] }) as never,
    );
    const { result } = renderHook(() => useGraphList());
    expect(result.current.loading).toBe(false); // cache hit → sem spinner
    expect(result.current.result.items).toEqual([{ id: "cached", nome: "Cached" }]);
    await waitFor(() => expect(result.current.result.items).toEqual([{ id: "fresh", nome: "Fresh" }]));
  });
});
