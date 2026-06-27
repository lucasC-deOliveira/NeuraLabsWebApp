import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGraphInteractions } from "./useGraphInteractions";

function setup(override: Record<string, unknown> = {}) {
  const setLayout = vi.fn();
  const setZoom = vi.fn();
  const setPan = vi.fn();
  const props = {
    layout: [{ id: "n1", x: 10, y: 20 }],
    setLayout,
    zoom: 0.6,
    setZoom,
    pan: { x: 0, y: 0 },
    setPan,
    svgRef: { current: null },
    ...override,
  };
  const { result } = renderHook(() => useGraphInteractions(props as never));
  return { result, setLayout, setZoom, setPan };
}

const wheel = (deltaY: number) =>
  ({ deltaY, clientX: 100, clientY: 100, preventDefault: vi.fn() }) as unknown as WheelEvent;

describe("useGraphInteractions", () => {
  it("handleWheel zooms by 0.08 around the cursor and repositions the pan", () => {
    const { result, setZoom, setPan } = setup();
    const e = wheel(-1);
    result.current.handleWheel(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(setZoom.mock.calls[0][0]).toBeCloseTo(0.68, 5);
    expect(setPan).toHaveBeenCalled();
  });

  it("handleWheel clamps the zoom to a minimum of 0.2", () => {
    const { result, setZoom } = setup({ zoom: 0.21 });
    result.current.handleWheel(wheel(1));
    expect(setZoom).toHaveBeenCalledWith(0.2);
  });

  it("focusNode centers the node and lifts the zoom to at least 0.8", () => {
    const { result, setPan, setZoom } = setup();
    result.current.focusNode({ id: "n1", x: 10, y: 20 } as never);
    expect(setPan).toHaveBeenCalledWith({ x: 494, y: 288 });
    expect(setZoom).toHaveBeenCalledWith(0.8);
  });
});
