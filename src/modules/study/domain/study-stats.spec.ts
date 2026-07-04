import { describe, it, expect } from "vitest";
import { formatDuration, computeAccuracy } from "./study-stats";

describe("formatDuration", () => {
  it("formats milliseconds as mm:ss", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(5000)).toBe("00:05");
    expect(formatDuration(65000)).toBe("01:05");
    expect(formatDuration(600000)).toBe("10:00");
  });
});

describe("computeAccuracy", () => {
  it("rounds the correct/total percentage", () => {
    expect(computeAccuracy(8, 10)).toBe(80);
    expect(computeAccuracy(1, 3)).toBe(33);
  });

  it("returns 0 when there are no cards", () => {
    expect(computeAccuracy(0, 0)).toBe(0);
  });
});
