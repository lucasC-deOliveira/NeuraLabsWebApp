import { describe, it, expect } from "vitest";
import { newItems } from "./seen-store";

describe("newItems", () => {
  it("returns ids present now that were not seen before", () => {
    expect(newItems(["a", "b", "c"], ["a"])).toEqual(["b", "c"]);
  });

  it("returns nothing when all current were already seen", () => {
    expect(newItems(["a", "b"], ["a", "b", "c"])).toEqual([]);
  });

  it("returns everything on the first ever check (nothing seen)", () => {
    expect(newItems(["a", "b"], [])).toEqual(["a", "b"]);
  });
});
