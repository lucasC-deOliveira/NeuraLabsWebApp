import { describe, it, expect } from "vitest";
import { periodDays } from "./period";

describe("periodDays", () => {
  it("maps a period value to its days", () => {
    expect(periodDays("7")).toBe(7);
    expect(periodDays("365")).toBe(365);
    expect(periodDays("all")).toBe(36_500);
  });
});
