import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGraphPhysics } from "./useGraphPhysics";
import { physicsStep } from "../services/graph-physics.service";

// physicsStep devolve o MESMO array (estabilizado) → o loop para após 1 tick.
vi.mock("../services/graph-physics.service", () => ({
  physicsStep: vi.fn((prev) => prev),
  DEFAULT_CLUSTER_OPTIONS: {},
}));

let rafCb: FrameRequestCallback | null;

beforeEach(() => {
  rafCb = null;
  vi.mocked(physicsStep).mockClear();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafCb = cb;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => vi.unstubAllGlobals());

// setLayout fake que invoca o updater (como o setState do React) p/ rodar physicsStep.
const invokingSetLayout = () =>
  vi.fn((updater: unknown) => {
    if (typeof updater === "function") (updater as (p: unknown[]) => unknown)([{ id: "a", x: 0, y: 0 }]);
  });

describe("useGraphPhysics", () => {
  it("steps the simulation on a frame when enabled and settles", () => {
    const setLayout = invokingSetLayout();
    renderHook(() => useGraphPhysics({ enabled: true, setLayout, edges: [] }));

    expect(rafCb).toBeTypeOf("function");
    rafCb?.(0);

    expect(physicsStep).toHaveBeenCalledTimes(1);
    expect(setLayout).toHaveBeenCalled();
  });

  it("does not schedule or step when disabled", () => {
    const setLayout = invokingSetLayout();
    renderHook(() => useGraphPhysics({ enabled: false, setLayout, edges: [] }));

    expect(rafCb).toBeNull();
    expect(physicsStep).not.toHaveBeenCalled();
  });

  it("limits large graph updates and resumes immediately after a drag", () => {
    vi.mocked(physicsStep).mockImplementation((nodes) => [...nodes]);
    const setLayout = invokingSetLayout();
    const { unmount } = renderHook(() => useGraphPhysics({ enabled: true, setLayout, edges: [], frameIntervalMs: 100 }));
    rafCb?.(0);
    rafCb?.(50);
    expect(physicsStep).toHaveBeenCalledTimes(1);
    rafCb?.(100);
    window.dispatchEvent(new Event("pointerdown"));
    rafCb?.(200);
    expect(physicsStep).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new Event("pointerup"));
    rafCb?.(201);
    expect(physicsStep).toHaveBeenCalledTimes(3);
    unmount();
    vi.mocked(physicsStep).mockImplementation((nodes) => nodes);
  });

  it("sleeps after settling and ignores pointer releases without node movement", () => {
    vi.mocked(physicsStep).mockImplementation((nodes) => [...nodes]);
    let dragged = false;
    const setLayout = invokingSetLayout();
    const { unmount } = renderHook(() => useGraphPhysics({
      enabled: true, setLayout, edges: [], settleSteps: 2, shouldWakeOnPointerUp: () => dragged,
    }));
    rafCb?.(0);
    rafCb?.(1);
    rafCb?.(2);
    rafCb = null;
    window.dispatchEvent(new Event("pointerup"));
    expect(rafCb).toBeNull();
    expect(physicsStep).toHaveBeenCalledTimes(2);
    dragged = true;
    window.dispatchEvent(new Event("pointerup"));
    expect(rafCb).toBeTypeOf("function");
    unmount();
    vi.mocked(physicsStep).mockImplementation((nodes) => nodes);
  });
});
