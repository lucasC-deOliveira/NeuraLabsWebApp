import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useCachedResource } from "./useCachedResource";
import { cacheStore } from "../infra/local-cache-store";

beforeEach(() => localStorage.clear());

const def = { key: "res.x", version: 1 } as const;

describe("useCachedResource", () => {
  it("shows a spinner then the fetched data when nothing is cached", async () => {
    const fetcher = vi.fn(() => Promise.resolve("fresh"));
    const { result } = renderHook(() => useCachedResource<string>(def, fetcher, "err"));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.data).toBe("fresh"));
    expect(result.current.loading).toBe(false);
  });

  it("seeds from the cache instantly (no spinner) and revalidates in the background", async () => {
    cacheStore.slot<string>(def).write("cached");
    const fetcher = vi.fn(() => Promise.resolve("fresh"));
    const { result } = renderHook(() => useCachedResource<string>(def, fetcher, "err"));

    // Pintou na hora com o cache, sem loading.
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe("cached");
    // E revalidou por baixo, trocando pelo fresco e regravando o cache.
    await waitFor(() => expect(result.current.data).toBe("fresh"));
    expect(cacheStore.slot<string>(def).read()).toBe("fresh");
  });

  it("surfaces the error message when the fetch fails", async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error("boom")));
    const { result } = renderHook(() => useCachedResource<string>(def, fetcher, "fallback"));
    await waitFor(() => expect(result.current.error).toBe("boom"));
  });

  it("does not fetch when def is null", () => {
    const fetcher = vi.fn(() => Promise.resolve("x"));
    const { result } = renderHook(() => useCachedResource<string>(null, fetcher, "err"));
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("refetches on reload()", async () => {
    const fetcher = vi.fn(() => Promise.resolve("v"));
    const { result } = renderHook(() => useCachedResource<string>(def, fetcher, "err"));
    await waitFor(() => expect(result.current.data).toBe("v"));
    act(() => result.current.reload());
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });
});
