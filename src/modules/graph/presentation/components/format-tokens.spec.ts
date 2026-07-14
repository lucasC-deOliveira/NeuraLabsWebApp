import { describe, it, expect } from "vitest";
import { formatTokens } from "./format-tokens";

describe("formatTokens", () => {
  it("keeps counts below 1000 as-is", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(999)).toBe("999");
  });

  it("abbreviates thousands with one decimal", () => {
    expect(formatTokens(1000)).toBe("1.0k");
    expect(formatTokens(1234)).toBe("1.2k");
    expect(formatTokens(20500)).toBe("20.5k");
  });
});
