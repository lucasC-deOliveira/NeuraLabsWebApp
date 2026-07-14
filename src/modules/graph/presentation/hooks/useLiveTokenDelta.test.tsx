import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { graphHttp } from "@/modules/graph/infra/http";
import { useLiveTokenDelta } from "./useLiveTokenDelta";

vi.mock("@/modules/graph/infra/http", () => ({ graphHttp: { getTokenUsage: vi.fn() } }));
const mockGet = vi.mocked(graphHttp.getTokenUsage);

const usage = (total: number) => ({ total, prompt: 0, completion: 0, calls: 0 });

beforeEach(() => {
  vi.useFakeTimers();
  mockGet.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("useLiveTokenDelta", () => {
  it("reports tokens spent since it became active", async () => {
    mockGet.mockResolvedValueOnce(usage(100)).mockResolvedValue(usage(180));
    const { result } = renderHook(() => useLiveTokenDelta(true));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); }); // baseline poll: 100
    expect(result.current).toBe(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); }); // next poll: 180
    expect(result.current).toBe(80);
  });

  it("resets to zero when it goes inactive", async () => {
    mockGet.mockResolvedValueOnce(usage(100)).mockResolvedValue(usage(300));
    const { result, rerender } = renderHook(({ a }) => useLiveTokenDelta(a), { initialProps: { a: true } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current).toBeGreaterThan(0);
    rerender({ a: false });
    expect(result.current).toBe(0);
  });

  it("stays at zero and never throws when polling fails", async () => {
    mockGet.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useLiveTokenDelta(true));
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current).toBe(0);
  });
});
