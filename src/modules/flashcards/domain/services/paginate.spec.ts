import { describe, it, expect } from "vitest";
import { paginate } from "./paginate";

describe("paginate", () => {
  it("returns one empty page for an empty list", () => {
    expect(paginate([], 1, 12)).toEqual({ items: [], page: 1, totalPages: 1 });
  });

  it("slices the requested page (1-based)", () => {
    const r = paginate([1, 2, 3, 4, 5], 2, 2);
    expect(r).toEqual({ items: [3, 4], page: 2, totalPages: 3 });
  });

  it("clamps a page beyond the range to the last page", () => {
    const r = paginate([1, 2, 3], 9, 2);
    expect(r.page).toBe(2);
    expect(r.items).toEqual([3]);
  });

  it("clamps a non-positive page to the first", () => {
    expect(paginate([1, 2, 3], 0, 2).page).toBe(1);
  });
});
