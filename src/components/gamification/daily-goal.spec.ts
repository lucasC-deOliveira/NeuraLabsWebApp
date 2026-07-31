import { describe, it, expect } from "vitest";
import {
  dailyGoalProgress,
  clampDailyGoal,
  DEFAULT_DAILY_GOAL,
  MIN_DAILY_GOAL,
  MAX_DAILY_GOAL,
} from "./daily-goal";

describe("clampDailyGoal", () => {
  it("keeps a sensible goal, clamps the extremes, defaults on garbage", () => {
    expect(clampDailyGoal(20)).toBe(20);
    expect(clampDailyGoal(1)).toBe(MIN_DAILY_GOAL);
    expect(clampDailyGoal(9999)).toBe(MAX_DAILY_GOAL);
    expect(clampDailyGoal(NaN)).toBe(DEFAULT_DAILY_GOAL);
  });
});

describe("dailyGoalProgress", () => {
  it("reports partial progress toward the goal", () => {
    expect(dailyGoalProgress(12, 20)).toEqual({
      done: 12,
      goal: 20,
      pct: 0.6,
      met: false,
      remaining: 8,
    });
  });

  it("caps the ring at 100% when the goal is beaten, never overflowing", () => {
    const p = dailyGoalProgress(50, 20);
    expect(p.met).toBe(true);
    expect(p.pct).toBe(1);
    expect(p.remaining).toBe(0);
  });

  it("is empty at zero without dividing by a broken goal", () => {
    const p = dailyGoalProgress(0, 0);
    expect(p.goal).toBe(MIN_DAILY_GOAL);
    expect(p.pct).toBe(0);
    expect(p.met).toBe(false);
  });
});
