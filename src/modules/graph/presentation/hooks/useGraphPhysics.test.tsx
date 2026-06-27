import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGraphPhysics } from "./useGraphPhysics";
import { physicsStep } from "../services/graph-physics.service";

// physicsStep devolve o MESMO array (estabilizado) → o loop para após 1 tick.
vi.mock("../services/graph-physics.service", () => ({
  physicsStep: vi.fn((prev) => prev),
  DEFAULT_PHYSICS_OPTIONS: {},
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
});
