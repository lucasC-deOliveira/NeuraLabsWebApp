import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useGraphSettings } from "./useGraphSettings";
import { DEFAULT_PHYSICS_OPTIONS, DEFAULT_CLUSTER_OPTIONS } from "../services/graph-physics.service";

beforeEach(() => localStorage.clear());

describe("useGraphSettings", () => {
  it("starts from defaults when nothing is stored", () => {
    const apply = vi.fn();
    const { result } = renderHook(() => useGraphSettings(DEFAULT_PHYSICS_OPTIONS, apply));
    expect(result.current.physicsMode).toBe("default");
    expect(result.current.focusDepth).toBe(1);
    expect(apply).not.toHaveBeenCalled();
  });

  it("persists changes and rehydrates them on a later mount", () => {
    const first = renderHook(() => useGraphSettings(DEFAULT_PHYSICS_OPTIONS, vi.fn()));
    act(() => first.result.current.setPhysicsMode("cluster"));
    act(() => first.result.current.setFocusDepth(4));
    first.unmount();

    const apply = vi.fn();
    const second = renderHook(() => useGraphSettings(DEFAULT_CLUSTER_OPTIONS, apply));
    expect(second.result.current.physicsMode).toBe("cluster");
    expect(second.result.current.focusDepth).toBe(4);
  });

  it("applies the stored physics options into the controller on mount", () => {
    // primeira montagem salva o snapshot atual das opções...
    const first = renderHook(() => useGraphSettings(DEFAULT_PHYSICS_OPTIONS, vi.fn()));
    act(() => first.result.current.setPhysicsMode("cluster"));
    first.unmount();
    // ...numa nova montagem elas voltam ao controller via applyPhysicsOptions.
    const apply = vi.fn();
    renderHook(() => useGraphSettings(DEFAULT_CLUSTER_OPTIONS, apply));
    expect(apply).toHaveBeenCalledWith(DEFAULT_PHYSICS_OPTIONS);
  });
});
