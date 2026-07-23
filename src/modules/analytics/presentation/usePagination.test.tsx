import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePagination } from "./usePagination";

const items = Array.from({ length: 20 }, (_, i) => i);

describe("usePagination", () => {
  it("slices the first page and reports the page count", () => {
    const { result } = renderHook(() => usePagination(items, 8));
    expect(result.current.page).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(result.current.pageCount).toBe(3);
    expect(result.current.pageIndex).toBe(0);
  });

  it("advances and goes back through pages, clamped at the ends", () => {
    const { result } = renderHook(() => usePagination(items, 8));
    act(() => result.current.next());
    expect(result.current.page).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    act(() => result.current.next());
    act(() => result.current.next()); // já no fim, não passa
    expect(result.current.pageIndex).toBe(2);
    expect(result.current.page).toEqual([16, 17, 18, 19]);
    act(() => result.current.prev());
    expect(result.current.pageIndex).toBe(1);
  });

  it("clamps the index when the list shrinks below the current page", () => {
    const { result, rerender } = renderHook(({ list }) => usePagination(list, 8), {
      initialProps: { list: items },
    });
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.pageIndex).toBe(2);
    rerender({ list: items.slice(0, 5) }); // agora só uma página
    expect(result.current.pageIndex).toBe(0);
    expect(result.current.page).toEqual([0, 1, 2, 3, 4]);
  });
});
