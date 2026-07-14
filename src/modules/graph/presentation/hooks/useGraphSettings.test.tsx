import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useGraphSettings } from "./useGraphSettings";
import { DEFAULT_PHYSICS_OPTIONS, DEFAULT_CLUSTER_OPTIONS } from "../services/graph-physics.service";

beforeEach(() => localStorage.clear());

describe("useGraphSettings", () => {
  it("starts from defaults when nothing is stored", () => {
    const apply = vi.fn();
    const { result } = renderHook(() => useGraphSettings(DEFAULT_CLUSTER_OPTIONS, apply));
    expect(result.current.focusDepth).toBe(1);
    expect(apply).not.toHaveBeenCalled();
  });

  it("persists the focus depth and rehydrates it on a later mount", () => {
    const first = renderHook(() => useGraphSettings(DEFAULT_CLUSTER_OPTIONS, vi.fn()));
    act(() => first.result.current.setFocusDepth(4));
    first.unmount();

    const second = renderHook(() => useGraphSettings(DEFAULT_CLUSTER_OPTIONS, vi.fn()));
    expect(second.result.current.focusDepth).toBe(4);
  });

  it("applies the stored cluster options into the controller on mount", () => {
    const custom = { ...DEFAULT_CLUSTER_OPTIONS, gravitationalConstant: 1234 };
    renderHook(() => useGraphSettings(custom, vi.fn())).unmount();

    const apply = vi.fn();
    renderHook(() => useGraphSettings(DEFAULT_CLUSTER_OPTIONS, apply));
    expect(apply).toHaveBeenCalledWith(custom);
  });

  it("migrates legacy hierarchical stored options to the cluster default", () => {
    // preferências antigas do modo hierárquico (clusterBy "hierarchy") ficam salvas...
    renderHook(() => useGraphSettings(DEFAULT_PHYSICS_OPTIONS, vi.fn())).unmount();

    // ...e são substituídas pelo padrão de cluster no próximo carregamento.
    const apply = vi.fn();
    renderHook(() => useGraphSettings(DEFAULT_CLUSTER_OPTIONS, apply));
    expect(apply).toHaveBeenCalledWith(DEFAULT_CLUSTER_OPTIONS);
  });
});
