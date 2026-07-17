import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUndoStack } from "./useUndoStack";

describe("useUndoStack", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useUndoStack());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.nextUndoLabel).toBeNull();
  });

  it("runs the inverse of the most recent entry (LIFO)", async () => {
    const calls: string[] = [];
    const { result } = renderHook(() => useUndoStack());

    act(() => {
      result.current.push({ label: "first", invert: () => void calls.push("first") });
      result.current.push({ label: "second", invert: () => void calls.push("second") });
    });
    expect(result.current.nextUndoLabel).toBe("second");

    await act(async () => {
      await result.current.undo();
    });
    expect(calls).toEqual(["second"]);
    expect(result.current.nextUndoLabel).toBe("first");
  });

  it("redoes a redoable entry, re-running its forward action", async () => {
    const calls: string[] = [];
    const { result } = renderHook(() => useUndoStack());
    act(() =>
      result.current.push({
        label: "paste",
        invert: () => void calls.push("undo"),
        redo: () => void calls.push("redo"),
      }),
    );

    await act(async () => {
      await result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
    expect(result.current.nextRedoLabel).toBe("paste");

    await act(async () => {
      await result.current.redo();
    });
    expect(calls).toEqual(["undo", "redo"]);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.canUndo).toBe(true);
  });

  it("does not make undo-only entries (no redo) redoable", async () => {
    const { result } = renderHook(() => useUndoStack());
    act(() => result.current.push({ label: "ai", invert: vi.fn() }));
    await act(async () => {
      await result.current.undo();
    });
    expect(result.current.canRedo).toBe(false);
  });

  it("clears the redo stack when a new action is pushed", async () => {
    const { result } = renderHook(() => useUndoStack());
    act(() => result.current.push({ label: "a", invert: vi.fn(), redo: vi.fn() }));
    await act(async () => {
      await result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.push({ label: "b", invert: vi.fn() }));
    expect(result.current.canRedo).toBe(false);
  });

  it("is a no-op when there is nothing to undo or redo", async () => {
    const { result } = renderHook(() => useUndoStack());
    await act(async () => {
      await result.current.undo();
      await result.current.redo();
    });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
