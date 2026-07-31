import { describe, it, expect } from "vitest";
import { newlyDominated } from "./conquest-celebration";

describe("newlyDominated", () => {
  it("returns concepts dominated now that were not seen before", () => {
    expect(newlyDominated(["a", "b", "c"], ["a"])).toEqual(["b", "c"]);
  });

  it("returns nothing when all current were already seen", () => {
    expect(newlyDominated(["a", "b"], ["a", "b", "c"])).toEqual([]);
  });

  it("returns everything on the first ever check (nothing seen)", () => {
    expect(newlyDominated(["a", "b"], [])).toEqual(["a", "b"]);
  });
});
