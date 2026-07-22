import { describe, it, expect } from "vitest";
import { recentActivity, activityLevel } from "./activity-calendar";

const now = new Date("2026-07-22T12:00:00Z");

describe("recentActivity", () => {
  it("returns the last N days oldest-first, filling gaps with 0", () => {
    const out = recentActivity([{ date: "2026-07-21", count: 5 }], now, 3);
    expect(out).toEqual([
      { date: "2026-07-20", count: 0 },
      { date: "2026-07-21", count: 5 },
      { date: "2026-07-22", count: 0 },
    ]);
  });
});

describe("activityLevel", () => {
  it("maps a review count to an intensity level 0-4", () => {
    expect(activityLevel(0)).toBe(0);
    expect(activityLevel(2)).toBe(1);
    expect(activityLevel(5)).toBe(2);
    expect(activityLevel(10)).toBe(3);
    expect(activityLevel(20)).toBe(4);
  });
});
