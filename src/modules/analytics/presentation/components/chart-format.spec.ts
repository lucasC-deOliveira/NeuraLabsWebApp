import { describe, it, expect } from "vitest";
import { shortDate } from "./chart-format";

describe("shortDate", () => {
  it("formats YYYY-MM-DD as dd/mm", () => {
    expect(shortDate("2026-07-22")).toBe("22/07");
    expect(shortDate("2026-12-01")).toBe("01/12");
  });
});
